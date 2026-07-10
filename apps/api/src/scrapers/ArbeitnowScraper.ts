import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

interface ArbeitnowPublicJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

export class ArbeitnowScraper extends BaseScraper {
  readonly key = 'arbeitnow';
  readonly name = 'Arbeitnow';

  private readonly searchEndpoint = 'https://www.arbeitnow.com/api/job-board-api';

  async scrape(options?: { maxPages?: number }): Promise<JobCreateInput[]> {
    try {
      console.log(`[Scraper: ${this.name}] Fetching latest jobs from public API...`);

      const data = await this.client
        .get(this.searchEndpoint, {
          responseType: 'json',
          throwHttpErrors: false,
        })
        .json<{ data: ArbeitnowPublicJob[] }>();

      const rawJobs = data.data || [];

      console.log(`[Scraper: ${this.name}] Successfully fetched ${rawJobs.length} jobs.`);
      
      const allJobs: JobCreateInput[] = rawJobs.map((job) => this.mapToJobCreateInput(job));
      
      return allJobs;
    } catch (error) {
      console.error(`[Scraper: ${this.name}] Error in scrape:`, error);
      return [];
    }
  }

  private mapToJobCreateInput(job: ArbeitnowPublicJob): JobCreateInput {
    let employmentType: EmploymentType = 'full-time';
    const rawType = (job.job_types || []).join(' ').toLowerCase();
    if (rawType.includes('part-time') || rawType.includes('part_time')) {
      employmentType = 'part-time';
    } else if (rawType.includes('contract')) {
      employmentType = 'contract';
    } else if (rawType.includes('freelance')) {
      employmentType = 'freelance';
    } else if (rawType.includes('intern') || rawType.includes('internship')) {
      employmentType = 'internship';
    }

    const experienceLevel: ExperienceLevel = this.inferExperienceLevel(job.title);

    const tags = Array.from(new Set(job.tags || [])).filter(
      (tag) => tag && typeof tag === 'string'
    );

    return {
      title: job.title,
      company: job.company_name,
      location: job.location || (job.remote ? 'Remote' : 'Germany'),
      url: job.url,
      sourceId: `arbeitnow-${job.slug}`,
      sourceName: this.name,
      description: job.description || `This ${job.title} position is available at ${job.company_name}. View the full listing on Arbeitnow to apply.`,
      postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
      tags: tags.slice(0, 10),
      employmentType,
      experienceLevel,
      isRemote: job.remote || false,
    };
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
