import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

// Workable public API — requires sequential requests with delays to avoid 429s.
// Endpoint: POST https://apply.workable.com/api/v3/accounts/{slug}/jobs
// Body: { "query": "", "location": [], "department": [], "worktype": [], "remote": true }

export class WorkableScraper extends BaseScraper {
  readonly key = 'workable';
  readonly name = 'Workable ATS';

  // Verified Workable slugs
  private readonly companySlugs = [
    // Developer Tools / B2B SaaS
    'typeform', 'hotjar', 'contentful', 'algolia', 'cloudinary', 'storyblok',
    'intercom', 'unbounce', 'postscript', 'gorgias', 'omnisend', 'klaviyo-eu',
    // HR Tech
    'personio', 'kenjo', 'charlie', 'humaans',
    // Security
    'recorded-future', 'huntress', 'intezer', 'cynet',
    // HealthTech
    'infermedica', 'kaia-health', 'kry',
    // Travel / Hospitality
    'hostelworld', 'trivago',
    // EdTech
    'learnworlds', 'teachable',
    // Agency / Services
    'thoughtworks', 'slalom', 'bain',
    // Other
    'benchmarkemail', 'freshpaint', 'appcues-team', 'userguiding',
  ];

  async scrape(): Promise<JobCreateInput[]> {
    const allJobs: JobCreateInput[] = [];
    const slugs = [...new Set(this.companySlugs)];

    console.log(`[Scraper: ${this.name}] Scraping ${slugs.length} companies sequentially...`);

    for (const slug of slugs) {
      try {
        const jobs = await this.fetchCompanyJobs(slug);
        allJobs.push(...jobs);
      } catch (err) {
        // Silent skip
      }
      // Sequential with generous delay to avoid 429s
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    console.log(`[Scraper: ${this.name}] Successfully scraped total ${allJobs.length} jobs.`);
    return allJobs;
  }

  private async fetchCompanyJobs(slug: string): Promise<JobCreateInput[]> {
    const response = await this.client.post(`https://apply.workable.com/api/v3/accounts/${slug}/jobs`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://apply.workable.com',
        'Referer': `https://apply.workable.com/${slug}/`,
      },
      json: { query: '', location: [], department: [], worktype: [], remote: true },
      responseType: 'json',
      throwHttpErrors: false,
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode !== 404 && response.statusCode !== 403) {
        console.error(`[Scraper: ${this.name}] Failed ${slug}: ${response.statusCode}`);
      }
      return [];
    }

    const data = response.body as any;
    const rawJobs: any[] = data.results || [];

    if (rawJobs.length === 0) return [];

    const displayName = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const jobs: JobCreateInput[] = rawJobs.map((job: any) => {
      const location = [job.location?.city, job.location?.country].filter(Boolean).join(', ') || 'Remote';
      const isRemote = job.remote === true || location.toLowerCase().includes('remote');

      return {
        title: job.title,
        company: displayName,
        location,
        url: `https://apply.workable.com/${slug}/j/${job.shortcode}/`,
        sourceId: `workable-${job.shortcode}`,
        sourceName: this.name,
        description: `${job.title} at ${displayName}. Department: ${job.department || 'Unknown'}.`,
        postedAt: job.published_on || new Date().toISOString(),
        tags: ['tech', slug],
        employmentType: this.mapEmploymentType(job.employment_type),
        experienceLevel: this.mapExperienceLevel(job.experience),
        isRemote,
      };
    });

    if (jobs.length > 0) {
      console.log(`[Scraper: ${this.name}] ${displayName}: ${jobs.length} jobs`);
    }
    return jobs;
  }

  private mapEmploymentType(type: string): EmploymentType {
    if (!type) return 'full-time';
    const lower = type.toLowerCase();
    if (lower.includes('part')) return 'part-time';
    if (lower.includes('contract') || lower.includes('freelance')) return 'contract';
    if (lower.includes('intern')) return 'internship';
    return 'full-time';
  }

  private mapExperienceLevel(exp: string): ExperienceLevel {
    if (!exp) return 'mid';
    const lower = exp.toLowerCase();
    if (lower.includes('senior') || lower.includes('expert')) return 'senior';
    if (lower.includes('entry') || lower.includes('junior')) return 'entry';
    if (lower.includes('lead') || lower.includes('director')) return 'lead';
    return 'mid';
  }
}
