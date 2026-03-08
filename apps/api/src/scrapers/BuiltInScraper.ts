import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

export class BuiltInScraper extends BaseScraper {
  readonly key = 'builtin';
  readonly name = 'Built In (Remote)';
  private readonly endpoint = 'https://builtin.com/jobs/remote';

  async scrape(): Promise<JobCreateInput[]> {
    try {
      console.log(`[Scraper: ${this.name}] Starting to scrape BuiltIn HTML...`);
      const jobs: JobCreateInput[] = [];

      // Fetch 4 pages
      for (let page = 1; page <= 4; page++) {
        const pageUrl = page === 1 ? this.endpoint : `${this.endpoint}?page=${page}`;
        console.log(`[Scraper: ${this.name}] Fetching page ${page}...`);
        
        const response = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch BuiltIn page ${page}: ${response.status}`);
          break;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        let found = 0;
        $('[data-id="job-card"]').each((_, el) => {
          const title = $(el).find('a[data-id="job-card-title"]').text().trim() || $(el).find('.job-title').text().trim();
          const company = $(el).find('[data-id="company-title"]').text().trim() || $(el).find('.company-title').text().trim();
          const location = $(el).find('[data-id="job-location"]').text().trim();
          let link = $(el).find('a[data-id="job-card-title"]').attr('href') || $(el).find('a.job-row').attr('href') || '';
          
          if (link.startsWith('/')) {
            link = `https://builtin.com${link}`;
          }

          const sourceIdMatch = link.match(/\/(\d+)$/) || link.split('-');
          const sourceId = sourceIdMatch ? String(sourceIdMatch[sourceIdMatch.length - 1]) : crypto.randomUUID();

          if (title && link) {
            found++;
            jobs.push({
              title,
              company: company || 'Unknown Company',
              location: location || 'Remote',
              url: link,
              sourceId: sourceId,
              sourceName: this.name,
              description: `${title} at ${company}. Scraped from BuiltIn.`,
              postedAt: new Date().toISOString(),
              tags: ['tech', 'builtin'],
              employmentType: 'full-time' as EmploymentType,
              experienceLevel: this.inferExperienceLevel(title),
              isRemote: true,
            });
          }
        });

        if (found === 0) break;
        
        // Polite delay
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      console.log(`[Scraper: ${this.name}] Successfully scraped ${jobs.length} jobs.`);
      return jobs;

    } catch (error) {
      console.error(`[Scraper: ${this.name}] Error scraping:`, error);
      return [];
    }
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
}
