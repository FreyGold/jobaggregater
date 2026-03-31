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
  // LinkedIn scraper: every 1 hour.
  const runLinkedInScraper = async () => {
    console.log('⏰ Running 1-hour LinkedIn scraper cron...');
    try {
      const linkedIn = scraperRegistry.get('linkedin');
      if (linkedIn) {
        const results = await linkedIn.scrape();
        await processJobs(results);
      }
    } catch (error) {
      console.error('❌ LinkedIn scraper failed:', error);
    }
  };

  // API scrapers: every 3 hours.
  const runAPIScraper = async () => {
    console.log('⏰ Running 3-hour API scraper cron...');
    try {
      const apiScrapers = ['remotive', 'remoteok', 'hackernews', 'weWorkRemotely'];
      const sources = apiScrapers
        .map((key) => scraperRegistry.get(key))
        .filter((s) => s !== undefined) as any[];
      
      const results = await Promise.allSettled(sources.map((s) => s.scrape()));

      const allJobs: JobCreateInput[] = [];
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') allJobs.push(...res.value);
        else console.error(`❌ [Scraper: ${sources[i]?.name}] Error:`, res.reason);
      });
      await processJobs(allJobs);
    } catch (error) {
      console.error('❌ API scraper cron failed:', error);
    }
  };

  // LinkedIn every 1 hour at minute 0.
  cron.schedule('0 * * * *', runLinkedInScraper);
  // API scrapers every 3 hours.
  cron.schedule('0 */3 * * *', runAPIScraper);
  // setTimeout(runLinkedInScraper, 0);
};
