import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

interface RemoteOKJob {
  id: string;
  url: string;
  position: string;
  company: string;
  company_logo: string;
  location: string;
  salary_min: number;
  salary_max: number;
  description: string;
  date: string;
  tags: string[];
}

export class RemoteOKScraper extends BaseScraper {
  readonly key = 'remoteok';
  readonly name = 'Remote OK';
  private readonly endpoint = 'https://remoteok.com/api';

  async scrape(): Promise<JobCreateInput[]> {
    try {
      console.log(`[Scraper: ${this.name}] Starting to scrape...`);
      // Warning: RemoteOK blocks frequent requests / missing user-agent.
      const data = await this.client
        .get(this.endpoint, {
        headers: {
          'User-Agent': 'JobAggregator/1.0 (https://github.com/your-username/jobaggregator)',
          'Accept': 'application/json',
        },
        responseType: 'json',
        throwHttpErrors: false,
      })
      .json<any[]>();
      // RemoteOK API returns metadata in the first item of the array
      const jobs = data.filter(item => item.legal === undefined) as RemoteOKJob[];
      
      console.log(`[Scraper: ${this.name}] Found ${jobs.length} jobs.`);
      return jobs.map((job) => this.mapToJobCreateInput(job));
    } catch (error) {
      console.error(`[Scraper: ${this.name}] Error scraping:`, error);
      return [];
    }
  }

  private mapToJobCreateInput(job: RemoteOKJob): JobCreateInput {
    // Clean and validate tags
    const _tags = (job.tags || [])
      .map(t => t.toLowerCase().trim())
      .filter((t) => t && t.length > 0);

    return {
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryCurrency: job.salary_max ? 'USD' : undefined,
      url: job.url,
      sourceId: String(job.id),
      sourceName: this.name,
      description: job.description,
      postedAt: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
      tags: _tags.slice(0, 10),
      employmentType: 'full-time' as EmploymentType, // default assumed
      experienceLevel: this.inferExperienceLevel(job.position),
      isRemote: true,
    };
  }
  private inferExperienceLevel(title: string): ExperienceLevel {
    const lower = title.toLowerCase();
    if (lower.includes('senior') || lower.includes('staff') || lower.includes('principal') || lower.includes('sr')) return 'senior';
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head') || lower.includes('manager')) return 'lead';
    if (lower.includes('junior') || lower.includes('jr') || lower.includes('entry') || lower.includes('grad')) return 'entry';
    if (lower.includes('vp') || lower.includes('chief') || lower.includes('executive')) return 'executive';
    return 'mid';
  }

  /**
   * Scrape full job description from RemoteOK job page
   */
  async scrapeJobDescription(jobUrl: string): Promise<string> {
    try {
      const html = await this.fetchHtml(jobUrl);
      if (!html) return '';

      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      // RemoteOK job pages use these selectors
      const descriptionSelectors = [
        '[data-job-description]',
        '.job-description',
        '[class*="description"]',
        '.markdown',
        'article',
      ];

      for (const selector of descriptionSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          element.find('script,style,nav,button').remove();
          const descHtml = element.html()?.trim();
          if (descHtml && descHtml.length > 100) {
            return descHtml;
          }
        }
      }

      return '';
    } catch (error) {
      console.warn(`[Scraper: ${this.name}] Failed to fetch description from ${jobUrl}`);
      return '';
    }
  }
}
