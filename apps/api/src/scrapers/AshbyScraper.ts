import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

// Correct Ashby public API endpoint:
// GET https://api.ashbyhq.com/posting-api/job-board/{slug}
// Returns: { jobs: [...], apiVersion: '...' }

export class AshbyScraper extends BaseScraper {
  readonly key = 'ashby';
  readonly name = 'Ashby ATS';

  // Verified working slugs (tested against api.ashbyhq.com)
  private readonly companySlugs = [
    // Developer Tools / Infrastructure
    'linear', 'posthog', 'resend', 'neon', 'trigger',
    'temporal', 'depot', 'railway', 'render', 'fly',
    // Auth / Identity
    'workos', 'clerk', 'stytch', 'propelauth', 'kinde',
    // AI / ML & Dev AI
    'cohere', 'perplexity', 'character', 'ideogram', 'pika',
    'runway', 'stability', 'nomic', 'weaviate', 'qdrant',
    // Security / Compliance
    'vanta', 'drata', 'sprinto', 'secureframe',
    // Fintech
    'mercury', 'rho', 'moderntreasury', 'column', 'increase',
    'lithic', 'pinwheel', 'atomic', 'payitoff',
    // Product Analytics / Observability
    'highlight', 'openreplay', 'hyperdx',
    // Open Source Infrastructure
    'airbyte', 'dagster', 'prefect', 'mage-ai',
    // Other
    'liveblocks', 'inngest', 'dub', 'loops', 'openpanel',
    'plane', 'appflowy', 'cal', 'formbricks',
  ];

  private readonly BATCH_SIZE = 8;

  async scrape(): Promise<JobCreateInput[]> {
    const allJobs: JobCreateInput[] = [];
    const slugs = [...new Set(this.companySlugs)];

    console.log(`[Scraper: ${this.name}] Scraping ${slugs.length} companies in batches of ${this.BATCH_SIZE}...`);

    for (let i = 0; i < slugs.length; i += this.BATCH_SIZE) {
      const batch = slugs.slice(i, i + this.BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((slug) => this.fetchCompanyJobs(slug))
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
        }
      });

      if (i + this.BATCH_SIZE < slugs.length) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    console.log(`[Scraper: ${this.name}] Successfully scraped total ${allJobs.length} jobs.`);
    return allJobs;
  }

  private async fetchCompanyJobs(slug: string): Promise<JobCreateInput[]> {
    const response = await this.client.get(
      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
        },
        responseType: 'json',
        throwHttpErrors: false,
      }
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode !== 404 && response.statusCode !== 403) {
        console.error(`[Scraper: ${this.name}] Failed ${slug}: ${response.statusCode}`);
      }
      return [];
    }

    const data = response.body as any;
    // Ashby returns { jobs: [...], apiVersion: '...' }
    const rawJobs: any[] = data.jobs || [];

    if (rawJobs.length === 0) return [];

    const displayName = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const jobs: JobCreateInput[] = rawJobs
      .filter((job: any) => job.isListed !== false) // only show listed jobs
      .map((job: any) => ({
        title: job.title,
        company: displayName,
        location: job.location || (job.isRemote ? 'Remote' : 'Unknown'),
        url: `https://jobs.ashbyhq.com/${slug}/${job.id}`,
        sourceId: `ashby-${job.id}`,
        sourceName: this.name,
        description: job.descriptionHtml || `${job.title} at ${displayName}. Team: ${job.team || 'Unknown'}. Type: ${job.employmentType || 'Unknown'}.`,
        postedAt: job.publishedAt || new Date().toISOString(),
        tags: ['tech', slug],
        employmentType: this.mapEmploymentType(job.employmentType),
        experienceLevel: this.inferExperienceLevel(job.title),
        isRemote: job.isRemote === true || job.workplaceType?.toLowerCase().includes('remote') || false,
      }));

    if (jobs.length > 0) {
      console.log(`[Scraper: ${this.name}] ${displayName}: ${jobs.length} jobs`);
    }
    return jobs;
  }

  private inferExperienceLevel(title: string): ExperienceLevel {
    const lower = title.toLowerCase();
    if (lower.includes('senior') || lower.includes('staff') || lower.includes('principal') || lower.includes('sr')) {
      return 'senior';
    }
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head') || lower.includes('manager')) {
      return 'lead';
    }
    if (lower.includes('junior') || lower.includes('jr') || lower.includes('entry') || lower.includes('grad')) {
      return 'entry';
    }
    if (lower.includes('vp') || lower.includes('chief') || lower.includes('executive')) {
      return 'executive';
    }
    return 'mid';
  }

  private mapEmploymentType(type: string): EmploymentType {
    if (!type) return 'full-time';
    const lower = type.toLowerCase();
    if (lower.includes('part')) return 'part-time';
    if (lower.includes('contract') || lower.includes('freelance')) return 'contract';
    if (lower.includes('intern')) return 'internship';
    return 'full-time';
  }
}
