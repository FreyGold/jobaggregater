import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';
import { chunk } from '../utils/index.js';

// ─── GulfTalent Scraper ──────────────────────────────────────────
// GulfTalent.com specialises in Gulf countries (GCC) jobs.
// Public search: https://www.gulftalent.com/jobs/search?keywords=<k>&page=<n>

const GT_CATEGORIES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Mobile Developer', 'DevOps Engineer',
  'Data Engineer', 'Data Scientist', 'Machine Learning',
  'Cloud Engineer', 'Cybersecurity', 'QA Engineer',
  'Product Manager', 'UX Designer', 'Project Manager',
  'Business Analyst', 'Marketing Manager', 'Sales Representative',
  'Accountant', 'Financial Analyst', 'HR Manager',
  'Operations Manager', 'Supply Chain', 'Customer Service',
  'Content Writer', 'Graphic Designer', 'Mechanical Engineer',
  'Civil Engineer', 'Electrical Engineer', 'Pharmacist',
  'Teacher', 'Consultant', 'Legal',
  'Network Engineer', 'Database Administrator', 'IT Support',
  'Digital Marketing', 'Social Media', 'Real Estate',
  'Healthcare', 'Biomedical Engineer', 'Chemical Engineer',
  'Business Development', 'Auditor', 'Technical Writer',
  'Solutions Architect', 'Robotics', 'Blockchain',
  'Scrum Master', 'Nurse',
];

const PAGES = 10;

export class GulfTalentScraper extends BaseScraper {
  readonly key = 'gulftalent';
  readonly name = 'GulfTalent';

  async scrape(): Promise<JobCreateInput[]> {
    console.log(
      `[Scraper: ${this.name}] Starting (${GT_CATEGORIES.length} categories × ${PAGES} pages)...`,
    );
    const allJobs: JobCreateInput[] = [];
    const seenIds = new Set<string>();

    const keywordChunks = chunk(GT_CATEGORIES, 5); // 5 concurrent keywords
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

    for (let page = 1; page <= PAGES; page++) {
      const url =
        `https://www.gulftalent.com/jobs/search` +
        `?keywords=${encodeURIComponent(keyword)}` +
        `&page=${page}`;

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (!response.ok) break;

        const html = await response.text();
        const $ = cheerio.load(html);
        let found = 0;

        // GulfTalent job cards
        $('div.job-listing, div[class*="job-card"], article[class*="job"]').each((_, el) => {
          const titleEl = $(el).find('h2 a, a[class*="title"], h3 a').first();
          const title = titleEl.text().trim();
          const href = titleEl.attr('href') || '';
          const company = $(el).find('span[class*="company"], div[class*="company"], a[class*="company"]').first().text().trim();
          const location = $(el).find('span[class*="location"], div[class*="location"]').first().text().trim();

          const jobUrl = href.startsWith('http') ? href : `https://www.gulftalent.com${href}`;

          // Generate source ID
          const pathParts = href.split('/').filter(Boolean);
          let sourceId = pathParts.length > 0 ? `gt-${pathParts[pathParts.length - 1]}` : null;
          if ((!sourceId || sourceId === 'gt-') && title && company) {
            sourceId = Buffer.from(`gulftalent-${company}-${title}`)
              .toString('base64')
              .substring(0, 24);
          }

          if (title && sourceId && !seenIds.has(sourceId)) {
            seenIds.add(sourceId);
            found++;
            jobs.push({
              title,
              company: company || 'Unknown Company',
              location: location || 'Gulf Region',
              url: jobUrl,
              sourceId,
              sourceName: this.name,
              description: `${title} at ${company}. Found on GulfTalent.com.`,
              postedAt: new Date().toISOString(),
              tags: ['arab-jobs', 'gulf', keyword.toLowerCase().replace(/\s+/g, '-')],
              employmentType: 'full-time' as EmploymentType,
              experienceLevel: this.guessExperience(title),
              isRemote: false,
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
