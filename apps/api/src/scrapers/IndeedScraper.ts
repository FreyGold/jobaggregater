import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';
import { chunk } from '../utils/index.js';

// ─── Indeed Scraper (Arab Countries) ─────────────────────────────
// Indeed doesn't have country-specific domains for all Arab countries,
// but supports location-based search on indeed.com.

const INDEED_CATEGORIES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Mobile Developer', 'DevOps Engineer',
  'Data Engineer', 'Data Scientist', 'Machine Learning',
  'Cloud Engineer', 'Security Engineer', 'QA Engineer',
  'Product Manager', 'UX Designer', 'Project Manager',
  'Business Analyst', 'Marketing Manager', 'Sales Representative',
  'Accountant', 'Financial Analyst', 'HR Manager',
  'Operations Manager', 'Supply Chain', 'Customer Service',
  'Content Writer', 'Graphic Designer', 'Mechanical Engineer',
  'Civil Engineer', 'Electrical Engineer', 'Pharmacist',
  'Teacher', 'Consultant', 'Legal Counsel',
  'Network Engineer', 'Database Administrator', 'Systems Analyst',
  'IT Support', 'Digital Marketing', 'Social Media Manager',
  'Real Estate', 'Healthcare', 'Biomedical Engineer',
  'Chemical Engineer', 'Blockchain Developer', 'Game Developer',
  'Business Development', 'Auditor', 'Robotics Engineer',
  'Solutions Architect', 'Technical Writer', 'UI Designer',
  'Scrum Master',
];

const INDEED_COUNTRIES = [
  { name: 'Saudi Arabia', location: 'Saudi Arabia' },
  { name: 'United Arab Emirates', location: 'United Arab Emirates' },
  { name: 'Egypt', location: 'Egypt' },
  { name: 'Qatar', location: 'Qatar' },
  { name: 'Kuwait', location: 'Kuwait' },
  { name: 'Bahrain', location: 'Bahrain' },
  { name: 'Oman', location: 'Oman' },
  { name: 'Jordan', location: 'Jordan' },
  { name: 'Lebanon', location: 'Lebanon' },
  { name: 'Iraq', location: 'Iraq' },
  { name: 'Morocco', location: 'Morocco' },
  { name: 'Tunisia', location: 'Tunisia' },
  { name: 'Algeria', location: 'Algeria' },
  { name: 'Libya', location: 'Libya' },
  { name: 'Sudan', location: 'Sudan' },
  { name: 'Yemen', location: 'Yemen' },
  { name: 'Syria', location: 'Syria' },
  { name: 'Palestine', location: 'Palestine' },
  { name: 'Somalia', location: 'Somalia' },
  { name: 'Mauritania', location: 'Mauritania' },
  { name: 'Djibouti', location: 'Djibouti' },
  { name: 'Comoros', location: 'Comoros' },
];

const PAGES = 10;

export class IndeedScraper extends BaseScraper {
  readonly key = 'indeed';
  readonly name = 'Indeed';

  async scrape(): Promise<JobCreateInput[]> {
    console.log(
      `[Scraper: ${this.name}] Starting (${INDEED_COUNTRIES.length} countries × ${INDEED_CATEGORIES.length} categories × ${PAGES} pages)...`,
    );
    const allJobs: JobCreateInput[] = [];
    const seenIds = new Set<string>();

    for (const country of INDEED_COUNTRIES) {
      const keywordChunks = chunk(INDEED_CATEGORIES, 5); // 5 concurrent keywords
      for (const kwChunk of keywordChunks) {
        await Promise.all(
          kwChunk.map(async (keyword) => {
            try {
              const jobs = await this.scrapeKeyword(keyword, country, seenIds);
              allJobs.push(...jobs);
              if (jobs.length > 0) {
                console.log(`[Scraper: ${this.name}] ${country.name} / "${keyword}": ${jobs.length} jobs (total: ${allJobs.length})`);
              }
            } catch (err) {
              console.error(`[Scraper: ${this.name}] Error ${country.name} / "${keyword}":`, err);
            }
          })
        );
        await this.delay(1000);
      }
      await this.delay(2000);
    }

    console.log(`[Scraper: ${this.name}] Completed. ${allJobs.length} total jobs.`);
    return allJobs;
  }

  private async scrapeKeyword(
    keyword: string,
    country: { name: string; location: string },
    seenIds: Set<string>,
  ): Promise<JobCreateInput[]> {
    const jobs: JobCreateInput[] = [];

    for (let page = 0; page < PAGES; page++) {
      const start = page * 10;
      const url =
        `https://www.indeed.com/jobs` +
        `?q=${encodeURIComponent(keyword)}` +
        `&l=${encodeURIComponent(country.location)}` +
        `&start=${start}`;

      try {
        const html = await this.fetchHtml(url, {
          sourceName: this.name,
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        if (!html) break;
        const $ = cheerio.load(html);
        let found = 0;

        // Indeed uses different card selectors — try multiple
        $('div.job_seen_beacon, div.jobsearch-ResultsList div.result').each((_, el) => {
          const titleEl = $(el).find('h2.jobTitle a, h2.jobTitle span');
          const title = titleEl.text().trim();
          const company = $(el).find('span[data-testid="company-name"], span.companyName').text().trim();
          const location = $(el).find('div[data-testid="text-location"], div.companyLocation').text().trim();
          const linkEl = $(el).find('h2.jobTitle a');
          const href = linkEl.attr('href') || '';
          const jobUrl = href.startsWith('http') ? href : `https://www.indeed.com${href}`;
          const dateStr = $(el).find('span.date span, span[data-testid="myJobsStateDate"]').text().trim();

          // Derive a unique source ID
          const idMatch = href.match(/jk=([a-f0-9]+)/i);
          let sourceId = idMatch ? idMatch[1] : null;
          if (!sourceId && title && company) {
            sourceId = Buffer.from(`indeed-${company}-${title}-${location}`)
              .toString('base64')
              .substring(0, 24);
          }

          const snippet = $(el).find('div.job-snippet, .jobsearch-JobComponent-description').text().trim();

          if (title && sourceId && !seenIds.has(sourceId)) {
            seenIds.add(sourceId);
            found++;
            jobs.push({
              title,
              company: company || 'Unknown Company',
              location: location || country.name,
              url: jobUrl.split('?')[0] || jobUrl,
              sourceId,
              sourceName: this.name,
              description: snippet || `${title} at ${company}. Found on Indeed for ${country.name}.`,
              postedAt: new Date().toISOString(),
              tags: ['arab-jobs', keyword.toLowerCase().replace(/\s+/g, '-')],
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
