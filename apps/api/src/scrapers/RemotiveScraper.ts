import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

interface RemotiveAlgoliaHit {
  id: string | number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  skills: string[];
  job_type: string; 
  discovered_on: string;
  locations: string[];
  salary: string;
  seniority: string;
}

interface RemotiveSearchResult {
  hits: RemotiveAlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  facets?: {
    category?: Record<string, number>;
  };
}

interface RemotiveAlgoliaResponse {
  result: {
    results: RemotiveSearchResult[];
  };
}

export class RemotiveScraper extends BaseScraper {
  readonly key = 'remotive';
  readonly name = 'Remotive';
  private readonly searchEndpoint = 'https://remotive.com/api/v2/jobs/search/';

  async scrape(options?: { maxPages?: number }): Promise<JobCreateInput[]> {
    try {
      console.log(`[Scraper: ${this.name}] Starting scrape via internal API...`);
      const limitPages = options?.maxPages || 20;
      const allJobs: JobCreateInput[] = [];

      let currentPage = 0;
      let totalPages = 1;

      while (currentPage < totalPages) {
        try {
          const result = await this.fetchSearchPage(currentPage);
          if (!result || !result.hits || result.hits.length === 0) break;

          const newJobs = result.hits.map(hit => this.mapToJobCreateInput(hit));
          allJobs.push(...newJobs);

          totalPages = result.nbPages;
          currentPage++;

          console.log(`[Scraper: ${this.name}] Fetched page ${currentPage}/${Math.min(totalPages, limitPages)} (${result.hits.length} jobs)`);

          if (currentPage >= limitPages) {
            console.log(`[Scraper: ${this.name}] Reached maxPages limit (${limitPages}).`);
            break;
          }
          
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`[Scraper: ${this.name}] Error fetching page ${currentPage}:`, err);
          break;
        }
      }

      console.log(`[Scraper: ${this.name}] Successfully scraped a total of ${allJobs.length} jobs.`);
      
      const uniqueSourceIds = new Set<string>();
      const uniqueJobs = allJobs.filter(job => {
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

  private async fetchSearchPage(page: number): Promise<RemotiveSearchResult | null> {
    const payload = {
      requests: [
        {
          indexName: 'remotive_unlimited',
          params: `hitsPerPage=50&page=${page}`
        }
      ]
    };

    const res = await fetch(this.searchEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Fetch jobs failed: ${res.statusText}`);
    const data = (await res.json()) as RemotiveAlgoliaResponse;
    return data.result?.results?.[0] || null;
  }

  private mapToJobCreateInput(job: RemotiveAlgoliaHit): JobCreateInput {
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

    let experienceLevel: ExperienceLevel = 'mid';
    const rawSeniority = (job.seniority || '').toLowerCase();
    if (rawSeniority.includes('senior')) {
      experienceLevel = 'senior';
    } else if (rawSeniority.includes('entry') || rawSeniority.includes('junior')) {
      experienceLevel = 'entry';
    } else if (rawSeniority.includes('lead') || rawSeniority.includes('manager')) {
      experienceLevel = 'lead';
    } else if (rawSeniority.includes('exec') || rawSeniority.includes('director')) {
      experienceLevel = 'executive';
    } else {
      // fallback to title inference if missing
      experienceLevel = this.inferExperienceLevel(job.title);
    }

    const tags = Array.from(new Set([...(job.skills || []), job.category])).filter(
      (tag) => tag && typeof tag === 'string'
    );

    const locationsStr = Array.isArray(job.locations) && job.locations.length > 0 
      ? job.locations.join(', ') 
      : 'Remote';

    // The internal search payload might lack full descriptions, populate fallback summary
    const fallbackDesc = `This ${job.title} position is available at ${job.company_name}. View the full listing on Remotive to apply.`;

    return {
      title: job.title,
      company: job.company_name,
      location: locationsStr,
      salaryMax: undefined, // Internal algolia API sends formatted strings, not reliable numbers without large parse library
      salaryCurrency: (job.salary && job.salary !== 'unspecified' && job.salary.length < 50) ? job.salary : undefined,
      url: job.url,
      sourceId: job.id.toString(),
      sourceName: this.name,
      description: fallbackDesc,
      postedAt: job.discovered_on ? new Date(job.discovered_on).toISOString() : new Date().toISOString(),
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
