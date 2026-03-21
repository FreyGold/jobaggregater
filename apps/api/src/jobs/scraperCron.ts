import cron from 'node-cron';
import { CacheService } from '../lib/redis.js';
import { scraperRegistry } from '../scrapers/ScraperRegistry.js';
import { jobRepository } from '../repositories/JobRepository.js';
import type { Job } from '../entities/Job.js';
import type { JobCreateInput } from '@jobagg/shared';

// Extracted shared upsert logic
async function processJobs(jobsToSave: JobCreateInput[]) {
  const mappedJobs: Partial<Job>[] = jobsToSave.map((job) => ({
    title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salaryCurrency ? `${job.salaryCurrency} ${job.salaryMax || ''}`.trim() : undefined,
    url: job.url,
    source: job.sourceName,
    description: job.description,
    postedAt: job.postedAt ? new Date(job.postedAt) : new Date(),
    tags: job.tags || [],
    employmentType: job.employmentType as any,
    experienceLevel: job.experienceLevel as any,
    isRemote: job.isRemote,
  }));

  const newOrUpdated = await jobRepository.upsertMany(mappedJobs);
  console.log(`✅ Scrape batch processed ${newOrUpdated} jobs.`);
  await CacheService.bumpListCacheVersion();
}

export const startScraperCron = () => {
  // Unified scrape loop: all sources every 12 hours.
  const runAllScrapers = async () => {
    console.log('⏰ Running 12-hour scraper cron...');
    try {
      const sources = scraperRegistry.getAll();
      const results = await Promise.allSettled(sources.map((s) => s.scrape()));

      const allJobs: JobCreateInput[] = [];
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') allJobs.push(...res.value);
        else console.error(`❌ [Scraper: ${sources[i]?.name}] Error:`, res.reason);
      });
      await processJobs(allJobs);
    } catch (error) {
      console.error('❌ 12-hour scraper failed:', error);
    }
  };

  // Every 12 hours at minute 0.
  cron.schedule('0 */12 * * *', runAllScrapers);
};
