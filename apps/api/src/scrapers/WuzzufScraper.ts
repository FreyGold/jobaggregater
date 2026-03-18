import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';
import { chunk } from '../utils/index.js';

// ─── Wuzzuf Scraper (Egypt) ──────────────────────────────────────
// Wuzzuf.net is Egypt's largest job board. Their public search pages
// are structured as /search/jobs/?q=<keyword>&start=<offset>.

const WUZZUF_CATEGORIES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Mobile Developer', 'DevOps Engineer',
  'Data Engineer', 'Data Scientist', 'Machine Learning',
  'Cloud Engineer', 'Cybersecurity', 'QA Engineer',
  'Product Manager', 'UX Designer', 'UI Designer',
  'Project Manager', 'Business Analyst', 'Marketing Manager',
  'Digital Marketing', 'Sales Representative', 'Accountant',
  'Financial Analyst', 'HR Manager', 'Operations Manager',
  'Supply Chain', 'Customer Service', 'Content Writer',
  'Graphic Designer', 'Mechanical Engineer', 'Civil Engineer',
  'Electrical Engineer', 'Pharmacist', 'Teacher',
  'Consultant', 'Legal', 'Network Engineer',
  'Database Administrator', 'IT Support', 'Social Media Manager',
  'Real Estate', 'Healthcare', 'Biomedical Engineer',
  'Chemical Engineer', 'Business Development', 'Auditor',
  'Technical Writer', 'Scrum Master', 'Solutions Architect',
  'Robotics', 'Blockchain',
];

const PAGES = 10;

export class WuzzufScraper extends BaseScraper {
  readonly key = 'wuzzuf';
  readonly name = 'Wuzzuf';

  async scrape(): Promise<JobCreateInput[]> {
    console.log(
      `[Scraper: ${this.name}] Starting (${WUZZUF_CATEGORIES.length} categories × ${PAGES} pages)...`,
    );
    const allJobs: JobCreateInput[] = [];
    const seenIds = new Set<string>();

    const keywordChunks = chunk(WUZZUF_CATEGORIES, 5); // 5 concurrent keywords
    for (const kwChunk of keywordChunks) {
      await Promise.all(
        kwChunk.map(async (keyword) => {
          try {
            const jobs = await this.scrapeKeyword(keyword, seenIds);
            allJobs.push(...jobs);
            if (jobs.length > 0) {
              console.log(`[Scraper: ${this.name}] "${keyword}": ${jobs.length} jobs (total: ${allJobs.length})`);
            }
          } catch (err) {
            console.error(`[Scraper: ${this.name}] Error on "${keyword}":`, err);
          }
        })
      );
      await this.delay(1200);
    }

    console.log(`[Scraper: ${this.name}] Completed. ${allJobs.length} total jobs.`);
    return allJobs;
  }

  private async scrapeKeyword(keyword: string, seenIds: Set<string>): Promise<JobCreateInput[]> {
    const jobs: JobCreateInput[] = [];

    for (let page = 0; page < PAGES; page++) {
      const start = page * 15; // Wuzzuf typically shows ~15 per page
      const url = `https://wuzzuf.net/search/jobs/?q=${encodeURIComponent(keyword)}&start=${start}`;

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          },
        });

        if (!response.ok) break;

        const html = await response.text();
        const $ = cheerio.load(html);
        let found = 0;

        // Wuzzuf job cards
        $('div.css-1gatmva, div.css-pkv5jg, div[class*="JobCard"]').each((_, el) => {
          const titleEl = $(el).find('h2 a, a[class*="JobTitle"]');
          const title = titleEl.text().trim();
          const href = titleEl.attr('href') || '';
          const company = $(el).find('a[class*="CompanyName"], div[class*="company"] a').first().text().trim();
          const location = $(el).find('span[class*="Location"], span[class*="location"]').text().trim();
          const jobType = $(el).find('span[class*="Type"], div[class*="type"] span').first().text().trim();

          const jobUrl = href.startsWith('http') ? href : `https://wuzzuf.net${href}`;

          // Extract ID from URL or generate one
          const idMatch = href.match(/\/jobs\/p\/([^/]+)/);
          let sourceId = idMatch ? `wuzzuf-${idMatch[1]}` : null;
          if (!sourceId && title && company) {
            sourceId = Buffer.from(`wuzzuf-${company}-${title}`)
              .toString('base64')
              .substring(0, 24);
          }

          const snippet = $(el).find('div.css-16vc97v, div[class*="JobSnippet"]').text().trim();

          if (title && sourceId && !seenIds.has(sourceId)) {
            seenIds.add(sourceId);
            found++;
            jobs.push({
              title,
              company: company || 'Unknown Company',
              location: location || 'Egypt',
              url: jobUrl,
              sourceId,
              sourceName: this.name,
              description: snippet || `${title} at ${company}. ${jobType ? `Type: ${jobType}.` : ''} Found on Wuzzuf (Egypt).`,
              postedAt: new Date().toISOString(),
              tags: ['arab-jobs', 'egypt', keyword.toLowerCase().replace(/\s+/g, '-')],
              employmentType: this.mapEmploymentType(jobType),
              experienceLevel: this.guessExperience(title),
              isRemote: location.toLowerCase().includes('remote'),
            });
          }
        });

        if (found === 0) break;
        await this.delay(800);
      } catch {
        break;
      }
    }

    return jobs;
  }

  private mapEmploymentType(type: string): EmploymentType {
    const t = type.toLowerCase();
    if (t.includes('part')) return 'part-time';
    if (t.includes('contract') || t.includes('freelance')) return 'contract';
    if (t.includes('intern')) return 'internship';
    return 'full-time';
  }

  private guessExperience(title: string): ExperienceLevel {
    const t = title.toLowerCase();
    if (t.includes('senior') || t.includes('sr.') || t.includes('staff') || t.includes('principal')) return 'senior';
    if (t.includes('junior') || t.includes('jr.') || t.includes('entry') || t.includes('intern')) return 'entry';
    if (t.includes('lead') || t.includes('director') || t.includes('head of') || t.includes('vp')) return 'lead';
    return 'mid';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
