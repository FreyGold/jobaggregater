import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

// WeWorkRemotely has multiple category RSS feeds. Scraping all of them
// at once multiplies our take vs. a single feed.
const WWR_FEEDS = [
  { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', tags: ['programming', 'development'] },
  { url: 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss', tags: ['devops', 'sysadmin'] },
  { url: 'https://weworkremotely.com/categories/remote-design-jobs.rss', tags: ['design', 'ux'] },
  { url: 'https://weworkremotely.com/categories/remote-product-jobs.rss', tags: ['product', 'pm'] },
  { url: 'https://weworkremotely.com/categories/remote-marketing-jobs.rss', tags: ['marketing', 'growth'] },
  { url: 'https://weworkremotely.com/categories/remote-sales-jobs.rss', tags: ['sales', 'business-development'] },
  { url: 'https://weworkremotely.com/categories/remote-customer-support-jobs.rss', tags: ['customer-support'] },
  { url: 'https://weworkremotely.com/categories/remote-copywriting-jobs.rss', tags: ['copywriting', 'content'] },
  { url: 'https://weworkremotely.com/categories/remote-finance-legal-jobs.rss', tags: ['finance', 'legal'] },
  { url: 'https://weworkremotely.com/categories/remote-data-science-jobs.rss', tags: ['data-science', 'analytics'] },
];

export class WeWorkRemotelyScraper extends BaseScraper {
  readonly key = 'weworkremotely';
  readonly name = 'We Work Remotely';

  async scrape(): Promise<JobCreateInput[]> {
    console.log(`[Scraper: ${this.name}] Scraping ${WWR_FEEDS.length} RSS feeds...`);
    const allJobs: JobCreateInput[] = [];
    const seenGuids = new Set<string>();

    const results = await Promise.allSettled(
      WWR_FEEDS.map((feed) => this.scrapeFeed(feed.url, feed.tags))
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        result.value.forEach((job) => {
          if (!seenGuids.has(job.sourceId)) {
            seenGuids.add(job.sourceId);
            allJobs.push(job);
          }
        });
      } else {
        console.error(`[Scraper: ${this.name}] Feed failed (${WWR_FEEDS[idx]?.url}):`, result.reason);
      }
    });

    console.log(`[Scraper: ${this.name}] Successfully scraped ${allJobs.length} jobs.`);
    return allJobs;
  }

  private async scrapeFeed(feedUrl: string, tags: string[]): Promise<JobCreateInput[]> {
    const response = await this.client.get(feedUrl, {
      headers: { 'User-Agent': 'JobAggregator/1.0' },
      responseType: 'text',
      throwHttpErrors: false,
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Failed to fetch RSS: ${response.statusCode}`);
    }

    const xml = String(response.body ?? '');
    const $ = cheerio.load(xml, { xmlMode: true });
    const jobs: JobCreateInput[] = [];

    $('item').each((_, el) => {
      const titleText = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const pubDateStr = $(el).find('pubDate').text().trim();
      
      // Keep full HTML description without stripping tags or truncating
      let description = $(el).find('description').text().trim();
      // Sometimes CDATA wraps HTML content in RSS:
      if (description.startsWith('<![CDATA[')) {
        description = description.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
      }

      const guid = $(el).find('guid').text().trim() || link;

      const parts = titleText.split(':');
      let company = 'Unknown Company';
      let position = titleText;

      if (parts.length > 1) {
        company = parts[0]?.trim() || company;
        position = parts.slice(1).join(':').trim();
      }

      let postedDate = new Date();
      if (pubDateStr) {
        const parsed = new Date(pubDateStr);
        if (!isNaN(parsed.getTime())) {
          postedDate = parsed;
        }
      }

      if (position && link) {
        jobs.push({
          title: position,
          company,
          location: 'Remote/Global',
          url: link,
          sourceId: guid,
          sourceName: this.name,
          description: description || titleText,
          postedAt: postedDate.toISOString(),
          tags,
          employmentType: 'full-time' as EmploymentType,
          experienceLevel: this.inferExperienceLevel(position),
          isRemote: true,
        });
      }
    });

    return jobs;
  }

  private inferExperienceLevel(title: string): ExperienceLevel {
    const lower = title.toLowerCase();
    if (lower.includes('senior') || lower.includes('staff') || lower.includes('principal') || lower.includes('sr')) return 'senior';
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head') || lower.includes('manager')) return 'lead';
    if (lower.includes('junior') || lower.includes('jr') || lower.includes('entry') || lower.includes('grad')) return 'entry';
    if (lower.includes('vp') || lower.includes('chief') || lower.includes('executive')) return 'executive';
    return 'mid';
  }
}
