import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

interface RemotivePublicJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

export class RemotiveScraper extends BaseScraper {
  readonly key = 'remotive';
  readonly name = 'Remotive';

  // Using the public API which includes full HTML descriptions
  private readonly searchEndpoint = 'https://remotive.com/api/remote-jobs?category=software-dev&limit=200';

  async scrape(options?: { maxPages?: number }): Promise<JobCreateInput[]> {
    try {
      console.log(`[Scraper: ${this.name}] Fetching latest software-dev jobs from public API...`);
      
      const res = await fetch(this.searchEndpoint);
      if (!res.ok) throw new Error(`Fetch jobs failed: ${res.statusText}`);
      
      const data = await res.json() as { jobs: RemotivePublicJob[] };
      const rawJobs = data.jobs || [];

      console.log(`[Scraper: ${this.name}] Successfully fetched ${rawJobs.length} jobs.`);
      
      const allJobs: JobCreateInput[] = rawJobs.map((job) => this.mapToJobCreateInput(job));
      
      const uniqueSourceIds = new Set<string>();
      const uniqueJobs = allJobs.filter((job) => {
        if (!uniqueSourceIds.has(job.sourceId)) {
          uniqueSourceIds.add(job.sourceId);
          return true;
        }
        return false;
      });

      return uniqueJobs;
    } catch (error) {
      console.error(`[Scraper: ${this.name}] Error in scrape:`, error);
      return [];
    }
  }

  private mapToJobCreateInput(job: RemotivePublicJob): JobCreateInput {
    let employmentType: EmploymentType = 'full-time';
    const rawType = (job.job_type || '').toLowerCase();
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

    const tags = Array.from(new Set([...(job.tags || []), job.category])).filter(
      (tag) => tag && typeof tag === 'string'
    );

    const locationsStr = job.candidate_required_location || 'Remote';

    return {
      title: job.title,
      company: job.company_name,
      location: locationsStr,
      salaryCurrency: (job.salary && job.salary.length < 50) ? job.salary : undefined,
      url: job.url,
      sourceId: `remotive-${job.id}`,
      sourceName: this.name,
      description: job.description || `This ${job.title} position is available at ${job.company_name}. View the full listing on Remotive to apply.`,
      postedAt: job.publication_date ? new Date(job.publication_date).toISOString() : new Date().toISOString(),
      tags: tags.slice(0, 10),
      employmentType,
      experienceLevel,
      isRemote: true,
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
