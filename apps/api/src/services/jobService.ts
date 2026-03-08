// ─── Job Service ─────────────────────────────────────────────────

import { DEFAULT_PAGE_SIZE, SUBSCRIPTION_LIMITS } from '@jobagg/shared';
import type { SubscriptionPlan } from '@jobagg/shared';
import { AppError } from '../middleware/errorHandler.js';
import { CacheService } from '../lib/redis.js';
import type { JobRepository } from '../repositories/JobRepository.js';
import type { UserRepository } from '../repositories/UserRepository.js';
import type { JobFiltersInput } from '../validators/job.schema.js';

export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async listJobs(filters: JobFiltersInput, userPlan: SubscriptionPlan = 'FREE') {
    const cacheKey = `jobs:list:${JSON.stringify(filters)}:${userPlan}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    // Get the REAL total count regardless of plan
    const { jobs: allJobs, total } = await this.jobRepository.findMany(filters);

    // Enforce tier limit on results
    const tierLimit = SUBSCRIPTION_LIMITS[userPlan]?.jobResultsPerPage;
    const effectiveLimit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const page = filters.page ?? 1;

    // For FREE tier: cap total returned jobs to 100 across all pages
    let jobs = allJobs;
    let cappedTotal = total;
    if (tierLimit !== null && tierLimit !== undefined) {
      const maxResults = tierLimit; // 100 for FREE
      cappedTotal = Math.min(total, maxResults);
      // If current page offset + results would exceed the cap, trim
      const offset = (page - 1) * effectiveLimit;
      if (offset >= maxResults) {
        jobs = [];
      } else {
        jobs = allJobs.slice(0, Math.max(0, maxResults - offset));
      }
    }

    const result = {
      data: jobs,
      meta: {
        page,
        limit: effectiveLimit,
        total, // ALWAYS return real total so users can see what they're missing
        totalPages: Math.ceil(cappedTotal / effectiveLimit),
        hasMore: page * effectiveLimit < cappedTotal,
        plan: userPlan,
        ...(tierLimit !== null && tierLimit !== undefined
          ? { cappedAt: tierLimit, upgradeMessage: `Showing max ${tierLimit} results. Upgrade for unlimited access.` }
          : {}),
      },
    };

    await CacheService.set(cacheKey, result, 60); // 1 minute cache
    return result;
  }

  async getJob(id: string) {
    const cacheKey = `job:${id}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const job = await this.jobRepository.findById(id);
    if (!job) {
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    await CacheService.set(cacheKey, job, 300); // 5 minutes cache
    return job;
  }

  async searchJobs(keyword: string, limit: number = 20) {
    const cacheKey = `jobs:search:${keyword}:${limit}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const results = await this.jobRepository.search(keyword, limit);
    await CacheService.set(cacheKey, results, 60);
    return results;
  }

  async saveJob(userId: string, jobId: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    const alreadySaved = await this.userRepository.isJobSaved(userId, jobId);
    if (alreadySaved) {
      throw new AppError(409, 'Job already saved', 'ALREADY_SAVED');
    }

    return this.userRepository.saveJob(userId, jobId);
  }

  async unsaveJob(userId: string, jobId: string) {
    return this.userRepository.unsaveJob(userId, jobId);
  }

  async getSavedJobs(userId: string) {
    const saved = await this.userRepository.getSavedJobs(userId);
    return saved.map((s: any) => s.job);
  }
}
