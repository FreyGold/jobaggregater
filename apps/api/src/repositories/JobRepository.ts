// ─── Job Repository ──────────────────────────────────────────────
// All Prisma queries for jobs live here. Never accessed directly from controllers.

import { AppDataSource } from '../config/data-source.js';
import { Job, EmploymentType, ExperienceLevel } from '../entities/Job.js';
import type { JobFiltersInput } from '../validators/job.schema.js';
import { Any, ILike } from 'typeorm';

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
    // TypeORM supports Bulk Upsert via QueryBuilder or raw save methods on POSTGRES via `ON CONFLICT`
    const results = await Promise.allSettled(
      jobs.map((job) =>
        this.repo.createQueryBuilder()
          .insert()
          .into(Job)
          .values(job)
          .orUpdate(
            ['title', 'description', 'salary', 'updatedAt'],
            ['url'] // Assuming 'url' is meant to be a unique constraint
          )
          .execute()
      )
    );
    return results.filter(r => r.status === 'fulfilled').length;
  }
}

export const jobRepository = new JobRepository();
