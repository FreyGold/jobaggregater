import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';
import { chunk } from '../utils/index.js';
// @ts-ignore
import PQueue from 'p-queue';

// ─── Tanqeeb Scraper ─────────────────────────────────────────────
// Tanqeeb.com is an Arab job aggregator covering multiple countries.
// Search URL: https://www.tanqeeb.com/s/<country>/jobs?q=<keyword>&page=<n>

const TANQEEB_CATEGORIES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'DevOps',
  'Data Engineer',
  'Data Scientist',
  'Machine Learning',
  'Cloud Engineer',
  'Cybersecurity',
  'QA Engineer',
  'Product Manager',
  'UX Designer',
  'Project Manager',
  'Business Analyst',
  'Marketing Manager',
  'Sales',
  'Accountant',
  'Financial Analyst',
  'HR Manager',
  'Operations Manager',
  'Supply Chain',
  'Customer Service',
  'Content Writer',
  'Graphic Designer',
  'Mechanical Engineer',
  'Civil Engineer',
  'Electrical Engineer',
  'Pharmacist',
  'Teacher',
  'Consultant',
  'Legal',
  'Network Engineer',
  'Database Administrator',
  'IT Support',
  'Digital Marketing',
  'Social Media',
  'Real Estate',
  'Healthcare',
  'Biomedical Engineer',
  'Chemical Engineer',
  'Business Development',
  'Auditor',
  'Technical Writer',
  'Solutions Architect',
  'Robotics',
  'Blockchain',
  'Scrum Master',
  'Nurse',
];

const TANQEEB_COUNTRIES = [
  { name: 'Saudi Arabia', slug: 'saudi-arabia' },
  { name: 'United Arab Emirates', slug: 'uae' },
  { name: 'Egypt', slug: 'egypt' },
  { name: 'Qatar', slug: 'qatar' },
  { name: 'Kuwait', slug: 'kuwait' },
  { name: 'Bahrain', slug: 'bahrain' },
  { name: 'Oman', slug: 'oman' },
  { name: 'Jordan', slug: 'jordan' },
  { name: 'Lebanon', slug: 'lebanon' },
  { name: 'Iraq', slug: 'iraq' },
  { name: 'Morocco', slug: 'morocco' },
  { name: 'Tunisia', slug: 'tunisia' },
  { name: 'Algeria', slug: 'algeria' },
  { name: 'Libya', slug: 'libya' },
  { name: 'Sudan', slug: 'sudan' },
  { name: 'Yemen', slug: 'yemen' },
  { name: 'Syria', slug: 'syria' },
  { name: 'Palestine', slug: 'palestine' },
  { name: 'Somalia', slug: 'somalia' },
  { name: 'Mauritania', slug: 'mauritania' },
  { name: 'Djibouti', slug: 'djibouti' },
  { name: 'Comoros', slug: 'comoros' },
];

const PAGES = 10;

export class TanqeebScraper extends BaseScraper {
  readonly key = 'tanqeeb';
  readonly name = 'Tanqeeb';

  // @ts-ignore
  private queue = new PQueue({ concurrency: 5 });

  async scrape(): Promise<JobCreateInput[]> {
    console.log(
      `[Scraper: ${this.name}] Starting (${TANQEEB_COUNTRIES.length} countries × ${TANQEEB_CATEGORIES.length} categories × ${PAGES} pages)...`,
    );
    const allJobs: JobCreateInput[] = [];
    const seenIds = new Set<string>();

    const tasks: (() => Promise<void>)[] = [];

    for (const country of TANQEEB_COUNTRIES) {
      for (const keyword of TANQEEB_CATEGORIES) {
        tasks.push(async () => {
          try {
            const jobs = await this.scrapeKeyword(keyword, country, seenIds);
            allJobs.push(...jobs);
            if (jobs.length > 0) {
              console.log(
                `[Scraper: ${this.name}] ${country.name} / "${keyword}": ${jobs.length} jobs (total: ${allJobs.length})`,
              );
            }
          } catch (err) {
            console.error(`[Scraper: ${this.name}] Error ${country.name} / "${keyword}":`, err);
          }
        });
      }
    }

    await this.queue.addAll(tasks);

    console.log(`[Scraper: ${this.name}] Completed. ${allJobs.length} total jobs.`);
    return allJobs;
  }

  private async scrapeKeyword(
    keyword: string,
    country: { name: string; slug: string },
    seenIds: Set<string>,
  ): Promise<JobCreateInput[]> {
    const jobs: JobCreateInput[] = [];

    for (let page = 1; page <= PAGES; page++) {
      const url = `https://${country.slug}.tanqeeb.com/en/jobs/search?keywords=${encodeURIComponent(keyword)}&page=${page}`;

      try {
        const response = await this.client.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
              '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          responseType: 'text',
        });

        const html = response.body as string;
        const $ = cheerio.load(html);
        let found = 0;

        $('.job-title')
          .closest('.card')
          .each((_, el) => {
            const titleEl = $(el).find('h2 a, a.job-title, h3 a, a[class*="title"]').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') || '';
            const company = $(el)
              .find('span.company, div[class*="company"], span[class*="employer"]')
              .first()
              .text()
              .trim();
            const location = $(el)
              .find('span[class*="location"], span.location, div[class*="location"]')
              .first()
              .text()
              .trim();
            const dateText = $(el)
              .find('span.date, time, span[class*="date"]')
              .first()
              .text()
              .trim();

            const jobUrl = href.startsWith('http') ? href : `https://www.tanqeeb.com${href}`;

            // Generate source ID
            const idMatch = href.match(/\/(\d+)(?:\/|$)/);
            let sourceId = idMatch ? `tq-${idMatch[1]}` : null;
            if (!sourceId && title && company) {
              sourceId = Buffer.from(`tanqeeb-${company}-${title}-${country.slug}`)
                .toString('base64')
                .substring(0, 24);
            }

            if (title && sourceId && !seenIds.has(sourceId)) {
              seenIds.add(sourceId);
              found++;
              const snippet = $(el)
                .find('p[class*="description"], div[class*="snippet"], div[class*="description"]')
                .text()
                .trim();

              jobs.push({
                title,
                company: company || 'Unknown Company',
                location: location || country.name,
                url: jobUrl,
                sourceId,
                sourceName: this.name,
                description:
                  snippet || `${title} at ${company}. Found on Tanqeeb in ${country.name}.`,
                postedAt: this.parseDate(dateText),
                tags: ['arab-jobs', country.slug, keyword.toLowerCase().replace(/\s+/g, '-')],
                employmentType: 'full-time' as EmploymentType,
                experienceLevel: this.guessExperience(title),
                isRemote: false,
              });
            }
          });

        if (found === 0) break;
        await this.delay(700);
      } catch {
        break;
      }
    }

    return jobs;
  }

  private parseDate(dateText: string): string {
    if (!dateText) return new Date().toISOString();
    try {
      const d = new Date(dateText);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private guessExperience(title: string): ExperienceLevel {
    const t = title.toLowerCase();
    if (t.includes('senior') || t.includes('sr.') || t.includes('staff') || t.includes('principal'))
      return 'senior';
    if (t.includes('junior') || t.includes('jr.') || t.includes('entry') || t.includes('intern'))
      return 'entry';
    if (t.includes('lead') || t.includes('director') || t.includes('head of') || t.includes('vp'))
      return 'lead';
    return 'mid';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
