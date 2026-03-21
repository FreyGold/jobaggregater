// ─── Job Repository ──────────────────────────────────────────────
// All Prisma queries for jobs live here. Never accessed directly from controllers.

import { AppDataSource } from '../config/data-source.js';
import { Job } from '../entities/Job.js';
import type { JobFiltersInput } from '../validators/job.schema.js';
import { chunk } from '../utils/chunk.js';

export class JobRepository {
  private repo = AppDataSource.getRepository(Job);

  async findMany(filters: JobFiltersInput) {
    const qb = this.repo.createQueryBuilder('job');

    // Build the WHERE conditions dynamically
    if (filters.keyword) {
      qb.andWhere('(job.title ILIKE :keyword OR job.company ILIKE :keyword)', {
        keyword: `%${filters.keyword}%`,
      });
    }
    
    if (filters.location) {
      qb.andWhere('job.location ILIKE :location', {
        location: `%${filters.location}%`,
      });
    }

    if (filters.salaryMin && !filters.salaryMax) {
       // Since salary is unfortunately a string right now, filtering by numbers directly on it via DB is tricky.
       // Real-world we'd split salary into min/max numeric fields. 
       // For now, this condition is approximated or we just ignore if it's text.
       // Let's assume we do a rough LIKE match or omit strict bounds if table layout isn't suited.
       // If keeping exact field mappings, `salary` string doesn't support GTE.
    }

    if (filters.source) {
      qb.andWhere('job.source = :source', { source: filters.source });
    }

    if (filters.isRemote !== undefined) {
      qb.andWhere('job.isRemote = :isRemote', { isRemote: filters.isRemote });
    }

    if (filters.arabOnly === true) {
      qb.andWhere(':arabTag = ANY(job.tags)', { arabTag: 'arab-jobs' });
    }

    if (filters.employmentType) {
      qb.andWhere('job.employmentType = :employmentType', {
        employmentType: filters.employmentType,
      });
    }

    if (filters.experienceLevel) {
      qb.andWhere('job.experienceLevel = :experienceLevel', {
        experienceLevel: filters.experienceLevel,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('job.postedAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    }

    if (filters.dateTo) {
      qb.andWhere('job.postedAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
    }

    if (filters.tags && filters.tags.length > 0) {
      // Postgres array overlap operator && could be used, or just simple IN if basic matching
      qb.andWhere('job.tags && ARRAY[:...tags]', { tags: filters.tags });
    }

    // Default sorting and pagination
    qb.orderBy(`job.${filters.sortBy || 'postedAt'}`, filters.sortOrder === 'asc' ? 'ASC' : 'DESC');
    
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total };
  }

  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async search(keyword: string, limit: number = 20) {
    const qb = this.repo.createQueryBuilder('job')
      .where('job.title ILIKE :keyword', { keyword: `%${keyword}%` })
      .orWhere('job.company ILIKE :keyword', { keyword: `%${keyword}%` })
      .orWhere('job.description ILIKE :keyword', { keyword: `%${keyword}%` })
      // Rough array search Approximation
      .orWhere(':exactKeyword = ANY(job.tags)', { exactKeyword: keyword.toLowerCase() })
      .orderBy('job.postedAt', 'DESC')
      .take(limit);

    return qb.getMany();
  }

  async upsertMany(jobs: Partial<Job>[]) {
    if (jobs.length === 0) return 0;

    // Deduplicate by URL before touching DB.
    const deduped = new Map<string, Partial<Job>>();
    for (const job of jobs) {
      if (!job.url) continue;
      deduped.set(job.url, job);
    }

    const uniqueJobs = Array.from(deduped.values());
    const batches = chunk(uniqueJobs, 1000);

    for (const batch of batches) {
      await this.repo.createQueryBuilder()
        .insert()
        .into(Job)
        .values(batch)
        .orUpdate(
          [
            'title',
            'company',
            'location',
            'salary',
            'source',
            'description',
            'postedAt',
            'tags',
            'employmentType',
            'experienceLevel',
            'isRemote',
            'updatedAt',
          ],
          ['url'],
        )
        .execute();
    }

    return uniqueJobs.length;
  }

  async findQueuedForEnrichment(limit: number = 10) {
    return this.repo.createQueryBuilder('job')
      .where('job.description LIKE :marker', { marker: '%Found on Indeed%' })
      .orWhere('job.description LIKE :marker2', { marker2: '%Found on LinkedIn%' })
      .orWhere('job.description LIKE :marker3', { marker3: '%Scraped from BuiltIn%' })
      .orWhere('job.description LIKE :marker4', { marker4: '%Found on Wuzzuf%' })
      .take(limit)
      .getMany();
  }

  async updateDescription(id: string, description: string) {
    return this.repo.update(id, { description, updatedAt: new Date() });
  }
}

export const jobRepository = new JobRepository();
