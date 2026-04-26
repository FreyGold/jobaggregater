import cron from 'node-cron';
import { CacheService } from '../lib/redis.js';
import { logInfo, logError, logWarn } from '../lib/logger.js';
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
  logInfo('Scrape batch processed', { newOrUpdated, total: jobsToSave.length });
  await CacheService.bumpListCacheVersion();
}

export const startScraperCron = () => {
  // LinkedIn scraper: every 1 hour.
  const runLinkedInScraper = async () => {
    logInfo('Starting LinkedIn scraper cron');
    try {
      const linkedIn = scraperRegistry.get('linkedin');
      if (linkedIn) {
        const results = await linkedIn.scrape();
        await processJobs(results);
        logInfo('LinkedIn scraper cron completed', { jobsCollected: results.length });
      }
    } catch (error) {
      logError('LinkedIn scraper cron failed', error as Error);
    }
  };

  // API scrapers: every 3 hours.
  const runAPIScraper = async () => {
    logInfo('Starting API scraper cron');
    try {
      const apiScrapers = ['remotive', 'remoteok', 'hackernews', 'weWorkRemotely', 'greenhouse', 'lever', 'ashby'];
      const sources = apiScrapers
        .map((key) => scraperRegistry.get(key))
        .filter((s) => s !== undefined) as any[];
      
      const results = await Promise.allSettled(sources.map((s) => s.scrape()));

      const allJobs: JobCreateInput[] = [];
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          allJobs.push(...res.value);
        } else {
          logWarn('API scraper failed', { scraper: sources[i]?.name, error: String(res.reason) });
        }
      });
      await processJobs(allJobs);
      logInfo('API scraper cron completed', { totalJobsCollected: allJobs.length, sourceCount: sources.length });
    } catch (error) {
      logError('API scraper cron failed', error as Error);
    }
  };

  // LinkedIn every 1 hour at minute 0.
  cron.schedule('0 * * * *', runLinkedInScraper);
  // API scrapers every 3 hours.
  cron.schedule('0 */3 * * *', runAPIScraper);
  // setTimeout(runLinkedInScraper, 0);
};
