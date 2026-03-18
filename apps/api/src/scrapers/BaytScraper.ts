import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';
import { chunk } from '../utils/index.js';
// @ts-ignore
import PQueue from 'p-queue';

// ─── Bayt.com Scraper (Pan-Arab) ─────────────────────────────────
// Bayt.com is the Middle East's largest job portal, covering all Arab countries.
// Search URL: https://www.bayt.com/en/international/jobs/<keyword>-jobs/?page=<n>

const BAYT_CATEGORIES = [
  'software-engineer',
  'frontend-developer',
  'backend-developer',
  'full-stack-developer',
  'mobile-developer',
  'devops-engineer',
  'data-engineer',
  'data-scientist',
  'machine-learning',
  'cloud-engineer',
  'cybersecurity',
  'qa-engineer',
  'product-manager',
  'ux-designer',
  'ui-designer',
  'project-manager',
  'business-analyst',
  'marketing-manager',
  'digital-marketing',
  'sales',
  'accountant',
  'financial-analyst',
  'hr-manager',
  'operations-manager',
  'supply-chain',
  'customer-service',
  'content-writer',
  'graphic-designer',
  'mechanical-engineer',
  'civil-engineer',
  'electrical-engineer',
  'pharmacist',
  'teacher',
  'consultant',
  'legal',
  'network-engineer',
  'database-administrator',
  'it-support',
  'social-media',
  'real-estate',
  'healthcare',
  'biomedical-engineer',
  'chemical-engineer',
  'business-development',
  'auditor',
  'technical-writer',
  'scrum-master',
  'solutions-architect',
  'robotics',
  'blockchain',
  'nurse',
];

const BAYT_COUNTRIES = [
  'saudi-arabia',
  'uae',
  'egypt',
  'qatar',
  'kuwait',
  'bahrain',
  'oman',
  'jordan',
  'lebanon',
  'iraq',
  'morocco',
  'tunisia',
  'algeria',
  'libya',
  'sudan',
  'yemen',
  'syria',
  'palestine',
  'somalia',
  'mauritania',
  'djibouti',
  'comoros',
];

const PAGES = 10;

export class BaytScraper extends BaseScraper {
  readonly key = 'bayt';
  readonly name = 'Bayt';

  // @ts-ignore
  private queue = new PQueue({ concurrency: 5 });

  async scrape(): Promise<JobCreateInput[]> {
    console.log(
      `[Scraper: ${this.name}] Starting (${BAYT_COUNTRIES.length} countries × ${BAYT_CATEGORIES.length} categories × ${PAGES} pages)...`,
    );
    const allJobs: JobCreateInput[] = [];
    const seenIds = new Set<string>();

    const tasks: (() => Promise<void>)[] = [];

    for (const country of BAYT_COUNTRIES) {
      for (const category of BAYT_CATEGORIES) {
        tasks.push(async () => {
          try {
            const jobs = await this.scrapeCategory(category, country, seenIds);
            allJobs.push(...jobs);
            if (jobs.length > 0) {
              console.log(
                `[Scraper: ${this.name}] ${country} / "${category}": ${jobs.length} jobs (total: ${allJobs.length})`,
              );
            }
          } catch (err) {
            console.error(`[Scraper: ${this.name}] Error ${country} / "${category}":`, err);
          }
        });
      }
    }

    await this.queue.addAll(tasks);

    console.log(`[Scraper: ${this.name}] Completed. ${allJobs.length} total jobs.`);
    return allJobs;
  }

  private async scrapeCategory(
    category: string,
    country: string,
    seenIds: Set<string>,
  ): Promise<JobCreateInput[]> {
    const jobs: JobCreateInput[] = [];

    for (let page = 1; page <= PAGES; page++) {
      const url = `https://www.bayt.com/en/${country}/jobs/${category}-jobs/?page=${page}`;

      try {
        const response = await this.client.get(url, {
          responseType: 'text',
        });

        const html = response.body as string;
        const $ = cheerio.load(html);
        let found = 0;

        // Bayt.com job listing cards
        $('li[data-js-job], div.has-sidebar li, div[class*="jobList"] li').each((_, el) => {
          const titleEl = $(el).find('h2 a, a[class*="jb-title"]');
          const title = titleEl.text().trim();
          const href = titleEl.attr('href') || '';
          const company = $(el)
            .find('div[class*="company"] a, span[class*="company"], b[class*="company"]')
            .first()
            .text()
            .trim();
          const location = $(el)
            .find('span[class*="location"], div[class*="location"]')
            .text()
            .trim();

          const jobUrl = href.startsWith('http') ? href : `https://www.bayt.com${href}`;

          // Extract source ID from URL slug
          const idMatch = href.match(/\/(\d+)\/?$/);
          let sourceId = idMatch ? `bayt-${idMatch[1]}` : null;
          if (!sourceId && title && company) {
            sourceId = Buffer.from(`bayt-${company}-${title}-${country}`)
              .toString('base64')
              .substring(0, 24);
          }

          if (title && sourceId && !seenIds.has(sourceId)) {
            seenIds.add(sourceId);
            found++;
            const snippet = $(el)
              .find('p[class*="description"], div[class*="description"]')
              .text()
              .trim();

            jobs.push({
              title,
              company: company || 'Unknown Company',
              location: location || country.replace(/-/g, ' '),
              url: jobUrl,
              sourceId,
              sourceName: this.name,
              description:
                snippet ||
                `${title} at ${company}. Found on Bayt.com in ${country.replace(/-/g, ' ')}.`,
              postedAt: new Date().toISOString(),
              tags: ['arab-jobs', category],
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
