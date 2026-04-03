import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

export class LeverScraper extends BaseScraper {
  readonly key = 'lever';
  readonly name = 'Lever ATS';

  // Verified Lever ATS slugs (api.lever.co/v0/postings/{slug})
  // Note: Many well-known companies (openai, vercel, notion, etc.) have moved off Lever
  private readonly companySlugs = [
    // Confirmed working from logs
    'palantir',
    // Enterprise / Defense
    'anduril', 'scale-ai',
    // Infrastructure
    'temporal', 'dbt-labs',
    // Security
    'wiz', 'vanta', 'drata',
    // Fintech
    'mercury', 'rho', 'moderntreasury', 'increase', 'lithic',
    // HR Tech
    'personio', 'lattice-hq',
    // Entertainment
    'netflix', 'spotify',
    // Other confirmed
    'asana', 'box', 'zenefits', 'mixpanel', 'thoughtworks',
    'squarespace', 'godaddy', 'surveymonkey', 'twitch',
    'lyft', 'cruise', 'zoox', 'aurora', 'nuro',
    'figma', 'canva-com', 'miro-team',
    'clearbit', 'segment', 'amplitude',
    'benchling', 'recursion', 'insitro', 'ginkgo',
    'niantic', 'epic-games', 'riot-games',
    'grammarly', 'duolingo', 'coursera',
    'brex', 'gusto', 'rippling',
    'carta', 'plaid-financial', 'marqeta',
    'coda', 'airtable', 'notion-hq',
  ];


  private readonly BATCH_SIZE = 10;

  async scrape(): Promise<JobCreateInput[]> {
    const allJobs: JobCreateInput[] = [];
    const slugs = [...new Set(this.companySlugs)];

    console.log(`[Scraper: ${this.name}] Scraping ${slugs.length} companies in batches of ${this.BATCH_SIZE}...`);

    for (let i = 0; i < slugs.length; i += this.BATCH_SIZE) {
      const batch = slugs.slice(i, i + this.BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((slug) => this.fetchCompanyJobs(slug))
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
        } else {
          console.error(`[Scraper: ${this.name}] Failed ${batch[idx]}:`, result.reason?.message ?? result.reason);
        }
      });

      if (i + this.BATCH_SIZE < slugs.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    console.log(`[Scraper: ${this.name}] Successfully scraped total ${allJobs.length} jobs.`);
    return allJobs;
  }

  private async fetchCompanyJobs(slug: string): Promise<JobCreateInput[]> {
    const response = await this.client.get(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      responseType: 'json',
      throwHttpErrors: false,
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode !== 404) {
        console.error(`[Scraper: ${this.name}] Failed to fetch ${slug}: ${response.statusCode}`);
      }
      return [];
    }

    const rawJobs = response.body as any[];

    if (!Array.isArray(rawJobs)) {
      return [];
    }

    const displayName = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const jobs: JobCreateInput[] = rawJobs.map((job: any) => ({
      title: job.text,
      company: displayName,
      location: job.categories?.location || 'Remote/Unknown',
      url: job.hostedUrl,
      sourceId: `lever-${job.id}`,
      sourceName: this.name,
      // Lever API provides both 'description' (plain text) and 'descriptionHtml' (HTML)
      // Prefer HTML for rich formatting, fallback to plain text, then placeholder
      description: 
        job.descriptionHtml || 
        job.description || 
        `${job.text} at ${displayName}. Team: ${job.categories?.team || 'Unknown'}. Commitment: ${job.categories?.commitment || 'Unknown'}.`,
      postedAt: new Date(job.createdAt).toISOString(),
      tags: ['tech', slug],
      employmentType: this.mapCommitment(job.categories?.commitment),
      isRemote: job.categories?.location?.toLowerCase().includes('remote') || false,
      experienceLevel: this.inferExperienceLevel(job.text),
    }));

    if (jobs.length > 0) {
      console.log(`[Scraper: ${this.name}] ${displayName}: ${jobs.length} jobs`);
    }
    return jobs;
  }

  private inferExperienceLevel(title: string): ExperienceLevel {
    const lower = title.toLowerCase();
    if (lower.includes('senior') || lower.includes('staff') || lower.includes('principal') || lower.includes('sr')) {
      return 'senior';
    }
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head') || lower.includes('manager')) {
      return 'lead';
    }
    if (lower.includes('junior') || lower.includes('jr') || lower.includes('entry') || lower.includes('grad')) {
      return 'entry';
    }
    if (lower.includes('vp') || lower.includes('chief') || lower.includes('executive')) {
      return 'executive';
    }
    return 'mid';
  }

  private mapCommitment(commitment: string): EmploymentType {
    if (!commitment) return 'full-time' as EmploymentType;
    const lower = commitment.toLowerCase();
    if (lower.includes('full-time') || lower.includes('full time')) return 'full-time' as EmploymentType;
    if (lower.includes('part-time') || lower.includes('part time')) return 'part-time' as EmploymentType;
    if (lower.includes('contract')) return 'contract' as EmploymentType;
    if (lower.includes('intern')) return 'internship' as EmploymentType;
    return 'full-time' as EmploymentType;
  }

  /**
   * Scrape full job description from Lever job page.
   * Note: Lever API already provides full descriptions (descriptionHtml),
   * so this method is primarily for fallback.
   */
  async scrapeJobDescription(jobUrl: string): Promise<string> {
    try {
      const html = await this.fetchHtml(jobUrl);
      if (!html) {
        console.warn(`[Scraper: ${this.name}] Could not fetch HTML for ${jobUrl}`);
        return '';
      }

      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      // Remove noise elements
      $('script,style,svg,noscript,nav,header,footer').remove();

      // Lever job pages use these selectors
      const descriptionSelectors = [
        '.posting-description',
        '.description',
        '[class*="posting-content"]',
        '[class*="description"]',
        '.content',
        'main',
      ];

      for (const selector of descriptionSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          element.find('script,style,nav,button').remove();
          const descHtml = element.html()?.trim();
          if (descHtml && descHtml.length > 200) {
            return descHtml;
          }
        }
      }

      // Last resort: find largest text block
      let largestBlock = '';
      $('div, section').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > largestBlock.length && text.length > 300) {
          largestBlock = text;
        }
      });

      if (largestBlock.length > 300) {
        return largestBlock.substring(0, 5000);
      }

      return '';
    } catch (error) {
      console.warn(`[Scraper: ${this.name}] Failed to fetch description from ${jobUrl}:`, error);
      return '';
    }
  }
}
