import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

export class BuiltInScraper extends BaseScraper {
  readonly key = 'builtin';
  readonly name = 'Built In (Remote)';
  private readonly endpoint = 'https://builtin.com/jobs/remote';

  private async fetchJobDescription(jobUrl: string): Promise<string> {
    try {
      const html = await this.fetchHtml(jobUrl);
      if (!html) return '';
      
      const $ = cheerio.load(html);

      // BuiltIn job pages - updated selectors for current structure
      const descriptionSelectors = [
        '[data-id="job-description"]',
        '[data-testid="job-description"]',
        '.job-description',
        '.job-description-content',
        '[class*="JobDescription"]',
        'article [class*="description"]',
        'main section [class*="description"]',
      ];

      for (const selector of descriptionSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          // Remove noisy elements
          element.find('script,noscript,style,svg,button,nav').remove();
          
          const descHtml = element.html()?.trim();
          if (descHtml && descHtml.length > 100) {
            console.log(`[Scraper: ${this.name}] Found description using selector: ${selector}`);
            return descHtml;
          }
        }
      }

      // Fallback: look for largest text content block
      const contentBlocks = $('div[class*="content"], section, article')
        .map((_, el) => {
          const $el = $(el);
          $el.find('script,style,nav,button').remove();
          const html = $el.html()?.trim();
          return html && html.length > 200 ? html : null;
        })
        .get()
        .filter(Boolean);

      if (contentBlocks.length > 0) {
        const longest = contentBlocks.sort((a, b) => (b?.length || 0) - (a?.length || 0))[0];
        if (longest && longest.length > 100) {
          console.log(`[Scraper: ${this.name}] Found description via fallback (length: ${longest.length})`);
          return longest;
        }
      }

      console.warn(`[Scraper: ${this.name}] No description found for ${jobUrl}`);
      return '';
    } catch (error) {
      console.error(`[Scraper: ${this.name}] Error fetching description:`, error);
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

      console.log(`[Scraper: ${this.name}] Successfully scraped ${jobs.length} jobs.`);
      // Note: Description enrichment is available on-demand via enrichJobDescription API
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

  /**
   * Scrape full job description from individual job page.
   * Note: BuiltIn often blocks direct access with Cloudflare.
   * This method will return empty string if blocked rather than throwing.
   */
  async scrapeJobDescription(jobUrl: string): Promise<string> {
    try {
      // Use render option for Cloudflare-protected pages when available
      const html = await this.fetchHtml(jobUrl, { sourceName: this.name, render: true });
      if (!html) {
        console.warn(`[Scraper: ${this.name}] Could not fetch HTML for ${jobUrl}`);
        return '';
      }

      const $ = cheerio.load(html);
      
      // Remove noise
      $('script,style,nav,header,footer,aside,button,form,svg,noscript').remove();
      
      // BuiltIn uses React with data attributes, try these selectors
      const selectors = [
        '[data-id="job-description"]',
        '[data-testid="job-description"]',
        '[class*="JobDescription"]',
        '[class*="job-description"]',
        'div[class*="description"]',
        'div[class*="job-details"]',
        'div[class*="job-content"]',
        'article',
        'main',
      ];

      for (const selector of selectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          element.find('script,style,svg,noscript,button').remove();
          const html = element.html()?.trim();
          if (html && html.length > 200) {
            return html;
          }
        }
      }

      // Last resort: find largest content block
      let largestBlock = '';
      $('div, section, article').each((_, el) => {
        const $el = $(el);
        $el.find('script,style,nav,button').remove();
        const text = $el.text().trim();
        if (text.length > largestBlock.length && text.length > 300) {
          largestBlock = text;
        }
      });

      if (largestBlock.length > 300) {
        return largestBlock.substring(0, 5000);
      }

      console.warn(`[Scraper: ${this.name}] No description content found for ${jobUrl}`);
      return '';
    } catch (error) {
      console.warn(`[Scraper: ${this.name}] Failed to scrape description from ${jobUrl}:`, error);
      return '';
    }
  }
}
