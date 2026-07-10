// ─── Job Service ─────────────────────────────────────────────────

import { DEFAULT_PAGE_SIZE, SUBSCRIPTION_LIMITS } from '@jobagg/shared';
import type { SubscriptionPlan } from '@jobagg/shared';
import { AppError } from '../middleware/errorHandler.js';
import { CacheService } from '../lib/redis.js';
import { logInfo, logWarn, logError } from '../lib/logger.js';
import type { JobRepository } from '../repositories/JobRepository.js';
import type { UserRepository } from '../repositories/UserRepository.js';
import type { JobFiltersInput } from '../validators/job.schema.js';

const LIST_CACHE_TTL_SECONDS = 300;
const JOB_CACHE_TTL_SECONDS = 900;
const SEARCH_CACHE_TTL_SECONDS = 300;

/**
 * If tab is 'today', calculate and set dateFrom to the start of today.
 * This aligns the filter with the calendar day instead of a rolling 24h window.
 */
function enrichFiltersWithTab(filters: JobFiltersInput): JobFiltersInput {
  if (filters.tab === 'today' && !filters.dateFrom) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return {
      ...filters,
      dateFrom: startOfDay.toISOString(),
    };
  }
  return filters;
}

function normalizeListFilters(filters: JobFiltersInput): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? DEFAULT_PAGE_SIZE,
    sortBy: filters.sortBy ?? 'postedAt',
    sortOrder: filters.sortOrder ?? 'desc',
  };

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (key === 'tab') continue; // Don't cache by tab, only the computed dateFrom
    if (Array.isArray(value)) {
      normalized[key] = [...value].sort();
      continue;
    }
    normalized[key] = value;
  }

  return Object.fromEntries(
    Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async listJobs(filters: JobFiltersInput, userPlan: SubscriptionPlan = 'FREE') {
    const startTime = Date.now();
    
    // Enrich filters: if tab='today', compute dateFrom on backend
    const enrichedFilters = enrichFiltersWithTab(filters);
    
    const cacheVersion = await CacheService.getListCacheVersion();
    const normalizedFilters = normalizeListFilters(enrichedFilters);
    const cacheKey = `jobs:list:v${cacheVersion}:${userPlan}:${JSON.stringify(normalizedFilters)}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      logInfo('Job list cache hit', { cacheKey, plan: userPlan });
      return cached;
    }

    // Get the REAL total count regardless of plan
    const { jobs: allJobs, total } = await this.jobRepository.findMany(enrichedFilters);
    logInfo('Fetched jobs from database', { jobCount: allJobs.length, total, plan: userPlan });

    // Enforce tier limit on results
    const tierLimit = SUBSCRIPTION_LIMITS[userPlan]?.jobResultsPerPage;
    const effectiveLimit = enrichedFilters.limit ?? DEFAULT_PAGE_SIZE;
    const page = enrichedFilters.page ?? 1;

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

    await CacheService.set(cacheKey, result, LIST_CACHE_TTL_SECONDS);
    const duration = Date.now() - startTime;
    logInfo('Job list operation completed', { plan: userPlan, duration: `${duration}ms`, resultCount: jobs.length });
    return result;
  }

  async getJob(id: string) {
    const cacheKey = `job:${id}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      logInfo('Job cache hit', { jobId: id });
      return cached;
    }

    const job = await this.jobRepository.findById(id);
    if (!job) {
      logWarn('Job not found', { jobId: id });
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    await CacheService.set(cacheKey, job, JOB_CACHE_TTL_SECONDS);
    logInfo('Job retrieved and cached', { jobId: id });
    return job;
  }

  async searchJobs(keyword: string, limit: number = 20) {
    const cacheKey = `jobs:search:${keyword}:${limit}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      logInfo('Search cache hit', { keyword, limit });
      return cached;
    }

    const results = await this.jobRepository.search(keyword, limit);
    await CacheService.set(cacheKey, results, SEARCH_CACHE_TTL_SECONDS);
    logInfo('Job search completed', { keyword, limit, resultCount: results.length });
    return results;
  }

  async saveJob(userId: string, jobId: string, status: 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED' = 'WISHLIST') {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
    }

    const alreadySaved = await this.userRepository.isJobSaved(userId, jobId);
    if (alreadySaved) {
      throw new AppError(409, 'Job already saved', 'ALREADY_SAVED');
    }

    return this.userRepository.saveJob(userId, jobId, status);
  }

  async updateSavedJobStatus(userId: string, jobId: string, status: 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED') {
    const exists = await this.userRepository.isJobSaved(userId, jobId);
    if (!exists) {
      throw new AppError(404, 'Saved job not found', 'NOT_FOUND');
    }
    return this.userRepository.updateSavedJobStatus(userId, jobId, status);
  }

  async unsaveJob(userId: string, jobId: string) {
    return this.userRepository.unsaveJob(userId, jobId);
  }

  async getSavedJobs(userId: string) {
    const saved = await this.userRepository.getSavedJobs(userId);
    return saved.map((s: any) => ({
      ...s.job,
      savedStatus: s.status,
      savedAt: s.createdAt,
    }));
  }
}
