import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

export class BuiltInScraper extends BaseScraper {
  readonly key = 'builtin';
  readonly name = 'Built In (Remote)';
  private readonly endpoint = 'https://builtin.com/jobs/remote';

  private async fetchJobDescription(jobUrl: string): Promise<string> {
    try {
      const res = await this.client.get(jobUrl, { responseType: 'text' });
      const html = res.body as string;
      const $ = cheerio.load(html);

      // BuiltIn job pages typically include the content in one of these containers.
      // We keep a couple of fallbacks to survive minor DOM changes.
      const container =
        $('[data-id="job-description"]').first() ||
        $('[data-testid="job-description"]').first() ||
        $('.job-description').first() ||
        $('main').first();

      if (!container || container.length === 0) return '';

      // Remove noisy widgets/sidebars if present.
      container.find('script,noscript,style,svg').remove();

      const descHtml = container.html()?.trim() ?? '';
      return descHtml;
    } catch {
      return '';
    }
  }

  async scrape(): Promise<JobCreateInput[]> {
    try {
      console.log(`[Scraper: ${this.name}] Starting to scrape BuiltIn HTML...`);
      const jobs: JobCreateInput[] = [];

      // Fetch 4 pages
      for (let page = 1; page <= 4; page++) {
        const pageUrl = page === 1 ? this.endpoint : `${this.endpoint}?page=${page}`;
        console.log(`[Scraper: ${this.name}] Fetching page ${page}...`);

        try {
          const response = await this.client.get(pageUrl, {
            responseType: 'text',
          });

          const html = response.body as string;
          const $ = cheerio.load(html);

          let found = 0;
          $('[data-id="job-card"]').each((_, el) => {
            const title =
              $(el).find('a[data-id="job-card-title"]').text().trim() ||
              $(el).find('.job-title').text().trim();
            const company =
              $(el).find('[data-id="company-title"]').text().trim() ||
              $(el).find('.company-title').text().trim();
            const location = $(el).find('[data-id="job-location"]').text().trim();
            let link =
              $(el).find('a[data-id="job-card-title"]').attr('href') ||
              $(el).find('a.job-row').attr('href') ||
              '';

            if (link.startsWith('/')) {
              link = `https://builtin.com${link}`;
            }

            const sourceIdMatch = link.match(/\/(\d+)$/) || link.split('-');
            const sourceId = sourceIdMatch
              ? String(sourceIdMatch[sourceIdMatch.length - 1])
              : crypto.randomUUID();

            if (title && link) {
              found++;
              jobs.push({
                title,
                company: company || 'Unknown Company',
                location: location || 'Remote',
                url: link,
                sourceId: sourceId,
                sourceName: this.name,
                // Set to empty here; we'll fill it after collecting the list.
                description: '',
                postedAt: new Date().toISOString(),
                tags: ['tech', 'builtin'],
                employmentType: 'full-time' as EmploymentType,
                experienceLevel: this.inferExperienceLevel(title),
                isRemote: true,
              });
            }
          });

          console.log(`[Scraper: ${this.name}] Found ${found} jobs on page ${page}`);
          if (found === 0) break;
        } catch (err: any) {
          console.error(`Failed to fetch BuiltIn page ${page}:`, err.message);
          break;
        }
      }

      // Enrich descriptions (best-effort; avoids placeholder text)
      for (const job of jobs) {
        if (!job.url) continue;
        const desc = await this.fetchJobDescription(job.url);
        if (desc) job.description = desc;
      }

      console.log(`[Scraper: ${this.name}] Successfully scraped ${jobs.length} jobs.`);
      return jobs;
    } catch (error) {
      console.error(`[Scraper: ${this.name}] Error scraping jobs:`, error);
      return [];
    }
  }

  private inferExperienceLevel(title: string): ExperienceLevel {
    const lower = title.toLowerCase();
    if (
      lower.includes('senior') ||
      lower.includes('staff') ||
      lower.includes('principal') ||
      lower.includes('sr')
    ) {
      return 'senior';
    }
    if (
      lower.includes('lead') ||
      lower.includes('director') ||
      lower.includes('head') ||
      lower.includes('manager')
    ) {
      return 'lead';
    }
    if (
      lower.includes('junior') ||
      lower.includes('jr') ||
      lower.includes('entry') ||
      lower.includes('grad')
    ) {
      return 'entry';
    }
    if (lower.includes('vp') || lower.includes('chief') || lower.includes('executive')) {
      return 'executive';
    }
    return 'mid';
  }
}
