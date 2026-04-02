import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';
import { chunk } from '../utils/index.js';
// @ts-ignore
import PQueue from 'p-queue';

// ─── LinkedIn Arab Countries Scraper ─────────────────────────────
// Searches across 50 job categories × 22 Arab countries × 10 pages.
// LinkedIn public search allows up to ~1000 results per query (40 pages × 25),
// but we cap at 10 pages (250 results) per category-country pair to stay polite.

const JOB_CATEGORIES = [
  // ─── Engineering ───────────────────────────────────────────────
  { keywords: 'Software Engineer', tags: ['software', 'engineer'] },
  { keywords: 'Frontend Developer', tags: ['frontend', 'javascript'] },
  { keywords: 'Backend Developer', tags: ['backend', 'server'] },
  { keywords: 'Full Stack Developer', tags: ['fullstack', 'web'] },
  { keywords: 'Mobile Developer', tags: ['mobile', 'ios', 'android'] },
  { keywords: 'DevOps Engineer', tags: ['devops', 'infrastructure'] },
  { keywords: 'Site Reliability Engineer', tags: ['sre', 'reliability'] },
  { keywords: 'Data Engineer', tags: ['data', 'pipeline'] },
  { keywords: 'Machine Learning Engineer', tags: ['ml', 'ai'] },
  { keywords: 'Data Scientist', tags: ['data-science', 'analytics'] },
  { keywords: 'Cloud Architect', tags: ['cloud', 'aws', 'azure'] },
  { keywords: 'Security Engineer', tags: ['security', 'cybersecurity'] },
  { keywords: 'QA Engineer', tags: ['qa', 'testing'] },
  { keywords: 'Embedded Software Engineer', tags: ['embedded', 'firmware'] },
  { keywords: 'Network Engineer', tags: ['network', 'infrastructure'] },
  { keywords: 'Database Administrator', tags: ['database', 'dba'] },
  { keywords: 'Systems Analyst', tags: ['systems', 'analyst'] },
  { keywords: 'IT Support Specialist', tags: ['it-support', 'helpdesk'] },
  { keywords: 'Game Developer', tags: ['game-dev', 'unity'] },
  { keywords: 'AR VR Developer', tags: ['ar', 'vr', 'xr'] },
  { keywords: 'Robotics Engineer', tags: ['robotics', 'automation'] },

  // ─── Product & Design ──────────────────────────────────────────
  { keywords: 'Product Manager', tags: ['product', 'pm'] },
  { keywords: 'UX Designer', tags: ['design', 'ux'] },
  { keywords: 'Product Designer', tags: ['design', 'product'] },
  { keywords: 'Graphic Designer', tags: ['design', 'graphic'] },
  { keywords: 'UI Designer', tags: ['design', 'ui'] },

  // ─── Business & Management ─────────────────────────────────────
  { keywords: 'Project Manager', tags: ['project-management', 'pm'] },
  { keywords: 'Business Analyst', tags: ['business-analyst', 'analytics'] },
  { keywords: 'Business Development Manager', tags: ['business-dev', 'sales'] },
  { keywords: 'Operations Manager', tags: ['operations', 'management'] },
  { keywords: 'Supply Chain Manager', tags: ['supply-chain', 'logistics'] },
  { keywords: 'Technical Program Manager', tags: ['tpm', 'program-management'] },
  { keywords: 'Solutions Architect', tags: ['solutions', 'architect'] },
  { keywords: 'Consultant', tags: ['consulting', 'advisory'] },

  // ─── Sales & Marketing ─────────────────────────────────────────
  { keywords: 'Marketing Manager', tags: ['marketing', 'digital'] },
  { keywords: 'Digital Marketing Specialist', tags: ['digital-marketing', 'seo'] },
  { keywords: 'Sales Representative', tags: ['sales', 'account'] },
  { keywords: 'Content Writer', tags: ['content', 'writing'] },
  { keywords: 'Social Media Manager', tags: ['social-media', 'marketing'] },

  // ─── Finance & Accounting ──────────────────────────────────────
  { keywords: 'Accountant', tags: ['accounting', 'finance'] },
  { keywords: 'Financial Analyst', tags: ['finance', 'analyst'] },
  { keywords: 'Auditor', tags: ['audit', 'finance'] },

  // ─── Healthcare & Science ──────────────────────────────────────
  { keywords: 'Pharmacist', tags: ['pharmacy', 'healthcare'] },
  { keywords: 'Healthcare Manager', tags: ['healthcare', 'management'] },
  { keywords: 'Biomedical Engineer', tags: ['biomedical', 'engineering'] },

  // ─── Engineering (Non-Software) ────────────────────────────────
  { keywords: 'Mechanical Engineer', tags: ['mechanical', 'engineering'] },
  { keywords: 'Civil Engineer', tags: ['civil', 'engineering'] },
  { keywords: 'Electrical Engineer', tags: ['electrical', 'engineering'] },
  { keywords: 'Chemical Engineer', tags: ['chemical', 'engineering'] },

  // ─── Other ─────────────────────────────────────────────────────
  { keywords: 'Human Resources Manager', tags: ['hr', 'people'] },
  { keywords: 'Legal Counsel', tags: ['legal', 'law'] },
  { keywords: 'Customer Service Representative', tags: ['customer-service', 'support'] },
  { keywords: 'Real Estate Agent', tags: ['real-estate', 'property'] },
  { keywords: 'Teacher', tags: ['education', 'teaching'] },
  { keywords: 'Blockchain Developer', tags: ['blockchain', 'web3'] },
];

// All 22 Arab League countries with their common LinkedIn location strings.
// LinkedIn's public search uses location= parameter (URL-encoded).
const ARAB_COUNTRIES = [
  { name: 'Saudi Arabia', location: 'Saudi Arabia' },
  { name: 'United Arab Emirates', location: 'United Arab Emirates' },
  { name: 'Egypt', location: 'Egypt' },
  { name: 'Qatar', location: 'Qatar' },
  { name: 'Kuwait', location: 'Kuwait' },
  { name: 'Bahrain', location: 'Bahrain' },
  { name: 'Oman', location: 'Oman' },
  { name: 'Jordan', location: 'Jordan' },
];

// 2 pages × 25 results per page = 50 results max per category-country pair
const PAGES_PER_CATEGORY = 2;

export class LinkedInScraper extends BaseScraper {
  readonly key = 'linkedin';
  readonly name = 'LinkedIn';

  // @ts-ignore
  private queue = new PQueue({ concurrency: 5 });

  async scrape(): Promise<JobCreateInput[]> {
    console.log(
      `[Scraper: ${this.name}] Starting multi-country scrape ` +
        `(${ARAB_COUNTRIES.length} countries × ${JOB_CATEGORIES.length} categories × ${PAGES_PER_CATEGORY} pages)...`,
    );
    const allJobs: JobCreateInput[] = [];
    const seenIds = new Set<string>();

    const tasks: (() => Promise<void>)[] = [];

    for (const country of ARAB_COUNTRIES) {
      for (const category of JOB_CATEGORIES) {
        tasks.push(async () => {
          try {
            const categoryJobs = await this.scrapeCategory(
              category.keywords,
              category.tags,
              country,
              seenIds,
            );
            allJobs.push(...categoryJobs);

            if (categoryJobs.length > 0) {
              console.log(
                `[Scraper: ${this.name}] ${country.name} / "${category.keywords}": ` +
                  `${categoryJobs.length} unique jobs (total: ${allJobs.length})`,
              );
            }
          } catch (err) {
            console.error(
              `[Scraper: ${this.name}] Error on ${country.name} / "${category.keywords}":`,
              err,
            );
          }
        });
      }
    }

    await this.queue.addAll(tasks);

    console.log(
      `[Scraper: ${this.name}] Finished multi-country scrape. Total unique jobs: ${allJobs.length}`,
    );

    // Note: Description enrichment is available on-demand via enrichJobDescription API
    // Enriching during scrape would be too slow and cause timeouts
    
    return allJobs;
  }

  private async scrapeCategory(
    keywords: string,
    tags: string[],
    country: { name: string; location: string },
    seenIds: Set<string>,
  ): Promise<JobCreateInput[]> {
    const jobs: JobCreateInput[] = [];
    const encodedKeywords = encodeURIComponent(keywords);
    const encodedLocation = encodeURIComponent(country.location);

    for (let page = 0; page < PAGES_PER_CATEGORY; page++) {
      const start = page * 25;
      const url =
        `https://www.linkedin.com/jobs/search` +
        `?keywords=${encodedKeywords}` +
        `&location=${encodedLocation}` +
        `&start=${start}`;

      try {
        const response = await this.client.get(url, {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          },
          responseType: 'text',
        });

        // if the status is not ok, got throws an HTTPError out of the box.

        const html = response.body as string;
        const $ = cheerio.load(html);
        let foundOnPage = 0;

        $('div.base-search-card').each((_, element) => {
          const title = $(element).find('.base-search-card__title').text().trim();
          const company = $(element).find('.base-search-card__subtitle').text().trim();
          const location = $(element).find('.job-search-card__location').text().trim();
          const rawUrl =
            $(element).find('.base-card__full-link').attr('href') ||
            $(element).find('a').attr('href') ||
            '';
          const dateStr = $(element).find('time').attr('datetime');

          const cleanUrl = (rawUrl ? rawUrl.split('?')[0] : '') as string;
          const idMatch = cleanUrl.match(/\/(\d+)(\/|\?|$)/);
          let sourceId = idMatch ? idMatch[1] : null;

          if (!sourceId && title && company) {
            sourceId = Buffer.from(`${company}-${title}-${location}`)
              .toString('base64')
              .substring(0, 24);
          }

          if (title && cleanUrl && sourceId && !seenIds.has(sourceId)) {
            seenIds.add(sourceId);
            foundOnPage++;
            const snippet = $(element)
              .find('.base-search-card__metadata, .job-search-card__snippet')
              .text()
              .trim();

            jobs.push({
              title,
              company: company || 'Unknown Company',
              location: location || country.name,
              url: cleanUrl,
              sourceId,
              sourceName: this.name,
              description:
                snippet ||
                `${title} at ${company}. Category: ${keywords}. Country: ${country.name}.`,
              postedAt: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
              tags: ['arab-jobs', ...tags],
              employmentType: 'full-time' as EmploymentType,
              experienceLevel: this.guessExperienceFromTitle(title),
              isRemote: false,
            });
          }
        });

        if (foundOnPage === 0) break;

        // Polite inter-page delay
        await this.delay(800);
      } catch {
        // Network error on this page — stop paginating
        break;
      }
    }

    return jobs;
  }

  private guessExperienceFromTitle(title: string): ExperienceLevel {
    const lower = title.toLowerCase();
    if (
      lower.includes('senior') ||
      lower.includes('sr.') ||
      lower.includes('staff') ||
      lower.includes('principal')
    )
      return 'senior';
    if (lower.includes('junior') || lower.includes('jr.') || lower.includes('entry'))
      return 'entry';
    if (lower.includes('intern')) return 'entry';
    if (
      lower.includes('lead') ||
      lower.includes('director') ||
      lower.includes('vp') ||
      lower.includes('head of')
    )
      return 'lead';
    return 'mid';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Scrape full job description from individual LinkedIn job page
   */
  async scrapeJobDescription(jobUrl: string): Promise<string> {
    try {
      const html = await this.fetchHtml(jobUrl);
      if (!html) return '';

      const $ = cheerio.load(html);

      // LinkedIn job pages use these selectors for description content
      const descriptionSelectors = [
        '.show-more-less-html__markup',
        '.description__text',
        '[class*="description"]',
        '.job-view-layout .description',
        'section.description',
      ];

      for (const selector of descriptionSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          // Remove script/style/svg tags
          element.find('script,style,svg,noscript').remove();
          
          const descHtml = element.html()?.trim();
          if (descHtml && descHtml.length > 100) {
            return descHtml;
          }
        }
      }

      // Fallback: try to find the largest text block
      const textBlocks = $('div, section, article')
        .map((_, el) => {
          const text = $(el).text().trim();
          return text.length > 200 ? text : null;
        })
        .get()
        .filter(Boolean);

      if (textBlocks.length > 0) {
        const longest = textBlocks.sort((a, b) => (b?.length || 0) - (a?.length || 0))[0];
        return longest || '';
      }

      return '';
    } catch (error) {
      console.warn(`[Scraper: ${this.name}] Failed to fetch description from ${jobUrl}`);
      return '';
    }
  }

}
