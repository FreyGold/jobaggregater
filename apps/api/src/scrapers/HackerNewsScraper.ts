import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

export class HackerNewsScraper extends BaseScraper {
  readonly key = 'hackernews';
  readonly name = 'Hacker News Jobs';
  private readonly endpoint = 'https://news.ycombinator.com/jobs';

  async scrape(): Promise<JobCreateInput[]> {
    try {
      console.log(`[Scraper: ${this.name}] Starting to scrape HTML from ${this.endpoint}...`);

      const response = await this.client.get(this.endpoint, {
        headers: {
          'User-Agent': 'JobAggregator/1.0',
          'Accept': 'text/html',
        },
        responseType: 'text',
        throwHttpErrors: false,
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Failed to fetch HTML: ${response.statusCode}`);
      }

      const html = String(response.body ?? '');
      const $ = cheerio.load(html);
      
      const jobs: JobCreateInput[] = [];

      // Extract job items from HN Jobs page
      $('tr.athing').each((_, element) => {
        const id = $(element).attr('id');
        const titleElement = $(element).find('td.title > span.titleline > a');
        const titleText = titleElement.text().trim();
        let url = titleElement.attr('href') || '';
        
        // Handle relative URLs
        if (url.startsWith('item?id=')) {
          url = `https://news.ycombinator.com/${url}`;
        }
        
        // HN Jobs title format is usually "{Company} is hiring {Role}" or "{Company} (YC XYZ) is hiring..."
        // We do a simple split to guess the company and job title
        let company = 'Unknown Company';
        let position = titleText;
        
        if (titleText.includes('is hiring')) {
          const parts = titleText.split('is hiring');
          company = parts[0]?.trim() || 'Unknown Company';
          position = parts[1]?.trim() || titleText;
        } else if (titleText.includes('hiring')) {
          const parts = titleText.split('hiring');
          company = parts[0]?.trim() || 'Unknown Company';
          position = parts[1]?.trim() || titleText;
        }
        
        const ageElement = $(element).next().find('span.age');
        const titleDateStr = ageElement.attr('title') || ''; 
        let finalDateStr = new Date().toISOString();
        if (titleDateStr) {
          const d = new Date(titleDateStr);
          if (!isNaN(d.getTime())) {
            finalDateStr = d.toISOString();
          }
        }
        
        if (id && titleText) {
          jobs.push({
            title: position,
            company: company,
            location: 'Remote/Various', // HN jobs are often remote or SF
            url: url,
            sourceId: id,
            sourceName: this.name,
            description: titleText, // Use full title as short description
            postedAt: finalDateStr,
            tags: ['tech', 'startup'], // Default tags for HN
            employmentType: 'full-time' as EmploymentType,
            experienceLevel: 'mid' as ExperienceLevel,
            isRemote: titleText.toLowerCase().includes('remote'),
          });
        }
      });

      console.log(`[Scraper: ${this.name}] Successfully scraped ${jobs.length} jobs.`);
      // Note: Description enrichment is available on-demand via enrichJobDescription API
      return jobs;

    } catch (error) {
      console.error(`[Scraper: ${this.name}] Error scraping:`, error);
      return [];
    }
  }

  /**
   * Scrape full job description from HackerNews job posting
   */
  async scrapeJobDescription(jobUrl: string): Promise<string> {
    try {
      // HN job postings can be external URLs or item?id= links
      if (!jobUrl.includes('news.ycombinator.com/item')) {
        // External URL - try generic scraping
        const html = await this.fetchHtml(jobUrl);
        if (!html) return '';

        const $ = cheerio.load(html);
        
        // Generic content selectors
        const selectors = [
          'article',
          '[role="main"]',
          'main',
          '.content',
          '.job-description',
        ];

        for (const selector of selectors) {
          const element = $(selector).first();
          if (element.length > 0) {
            element.find('script,style,nav,header,footer,button').remove();
            const descHtml = element.html()?.trim();
            if (descHtml && descHtml.length > 200) {
              return descHtml;
            }
          }
        }
      } else {
        // HN item page - extract comment text
        const html = await this.fetchHtml(jobUrl);
        if (!html) return '';

        const $ = cheerio.load(html);
        const commentText = $('.comment .commtext').first().html()?.trim();
        if (commentText && commentText.length > 100) {
          return commentText;
        }
      }

      return '';
    } catch (error) {
      console.warn(`[Scraper: ${this.name}] Failed to fetch description from ${jobUrl}`);
      return '';
    }
  }
}
