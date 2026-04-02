// ─── Job Description Enrichment Service ─────────────────────────

import { AppError } from '../middleware/errorHandler.js';
import { logInfo, logWarn, logError } from '../lib/logger.js';
import { needsEnrichment } from '../utils/descriptionUtils.js';
import type { JobRepository } from '../repositories/JobRepository.js';
import type { BaseScraper } from '../scrapers/BaseScraper.js';
import { scraperRegistry } from '../scrapers/ScraperRegistry.js';

/**
 * Service for enriching job descriptions on-demand
 */
export class JobDescriptionService {
  constructor(private readonly jobRepository: JobRepository) {}

  /**
   * Enrich a job's description by fetching it from the original source
   * Returns the updated job with full description
   */
  async enrichJobDescription(jobId: string): Promise<any> {
    const startTime = Date.now();
    
    // Fetch job from database
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    // Check if description needs enrichment
    if (!needsEnrichment(job.description)) {
      logInfo('Job description already complete', { jobId, descLength: job.description?.length });
      return job;
    }

    logInfo('Enriching job description', { 
      jobId, 
      source: job.source, 
      currentLength: job.description?.length || 0 
    });

    // Get appropriate scraper for the source
    const scraper = this.getScraperForSource(job.source);
    if (!scraper) {
      logWarn('No scraper available for source', { jobId, source: job.source });
      throw new AppError(
        400, 
        `Cannot enrich description: no scraper available for source "${job.source}"`, 
        'NO_SCRAPER_AVAILABLE'
      );
    }

    // Scrape the description
    let enrichedDescription: string;
    try {
      enrichedDescription = await this.scrapeDescription(scraper, job.url);
    } catch (error) {
      logError('Failed to scrape description', { 
        jobId, 
        source: job.source, 
        url: job.url, 
        error: error instanceof Error ? error.message : error 
      });
      throw new AppError(
        500, 
        'Failed to fetch job description from source', 
        'SCRAPE_FAILED'
      );
    }

    // Validate enriched description
    if (!enrichedDescription || enrichedDescription.length < 50) {
      logWarn('Scraped description too short or empty', { 
        jobId, 
        scrapedLength: enrichedDescription?.length || 0 
      });
      throw new AppError(
        500, 
        'Could not extract valid description from job page (less than 50 characters)', 
        'INVALID_DESCRIPTION'
      );
    }

    // Update database
    await this.jobRepository.updateDescription(jobId, enrichedDescription);

    // Fetch updated job
    const updatedJob = await this.jobRepository.findById(jobId);
    
    const duration = Date.now() - startTime;
    logInfo('Job description enriched successfully', { 
      jobId, 
      oldLength: job.description?.length || 0,
      newLength: enrichedDescription.length,
      duration: `${duration}ms`
    });

    return updatedJob;
  }

  /**
   * Get scraper instance for a given source name
   */
  private getScraperForSource(sourceName: string): BaseScraper | null {
    // Try to match by key (normalized lowercase)
    const normalizedKey = sourceName.toLowerCase().replace(/\s+/g, '');
    
    // Map common source names to scraper keys
    const sourceKeyMap: Record<string, string> = {
      'linkedin': 'linkedin',
      'remotive': 'remotive',
      'weworkremotely': 'weworkremotely',
      'wework remotely': 'weworkremotely',
      'we work remotely': 'weworkremotely',
      'builtin': 'builtin',
      'builtin(remote)': 'builtin',
      'built in': 'builtin',
      'built in (remote)': 'builtin',
      'remoteok': 'remoteok',
      'remote ok': 'remoteok',
      'hackernews': 'hackernews',
      'hacker news': 'hackernews',
      'hacker news jobs': 'hackernews',
      'greenhouse': 'greenhouse',
      'greenhouse ats': 'greenhouse',
      'lever': 'lever',
      'lever ats': 'lever',
      'ashby': 'ashby',
      'ashby ats': 'ashby',
      'workable': 'workable',
      'workable ats': 'workable',
      'tanqeeb': 'tanqeeb',
      'gulftalent': 'gulftalent',
      'gulf talent': 'gulftalent',
    };

    const key = sourceKeyMap[normalizedKey] || normalizedKey;
    return scraperRegistry.get(key) || null;
  }

  /**
   * Scrape description from job URL using appropriate scraper
   */
  private async scrapeDescription(scraper: BaseScraper, jobUrl: string): Promise<string> {
    // Check if scraper has dedicated description method
    if ('scrapeJobDescription' in scraper && typeof (scraper as any).scrapeJobDescription === 'function') {
      return await (scraper as any).scrapeJobDescription(jobUrl);
    }

    // Fallback: use generic fetchHtml from BaseScraper
    logWarn('Scraper does not implement scrapeJobDescription, using generic fetch', { 
      scraperName: scraper.name 
    });
    
    const html = await (scraper as any).fetchHtml(jobUrl);
    if (!html) {
      throw new Error('Failed to fetch HTML from job URL');
    }

    // Generic HTML parsing fallback
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    
    // Remove noise
    $('script,style,nav,header,footer,aside,button,form').remove();
    
    // Try common description selectors
    const selectors = [
      '[class*="description"]',
      '[data-description]',
      '[id*="description"]',
      'article',
      'main',
      '.content',
      '[class*="job-details"]',
      '[class*="job-info"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && text.length > 50) {
          return text;
        }
      }
    }

    // Aggressive fallback: get largest text block
    let largestText = '';
    $('div, section, article').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > largestText.length && text.length > 50) {
        largestText = text;
      }
    });

    if (largestText.length > 50) {
      return largestText.substring(0, 5000); // Cap at 5000 chars
    }

    throw new Error('Could not extract description from HTML');
  }

  /**
   * Batch enrich multiple jobs (useful for background processing)
   */
  async enrichMultipleJobs(jobIds: string[]): Promise<{ 
    success: string[]; 
    failed: Array<{ jobId: string; error: string }> 
  }> {
    const success: string[] = [];
    const failed: Array<{ jobId: string; error: string }> = [];

    for (const jobId of jobIds) {
      try {
        await this.enrichJobDescription(jobId);
        success.push(jobId);
      } catch (error) {
        failed.push({
          jobId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logInfo('Batch enrichment completed', { 
      total: jobIds.length, 
      success: success.length, 
      failed: failed.length 
    });

    return { success, failed };
  }
}
