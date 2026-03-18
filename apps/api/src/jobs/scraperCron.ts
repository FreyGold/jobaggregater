import cron from 'node-cron';
import { CacheService } from '../lib/redis.js';
import { scraperRegistry } from '../scrapers/ScraperRegistry.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { runJobEnrichment } from './enrichmentJob.js';
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
  await CacheService.delPattern('jobs:list:*');
}

export const startScraperCron = () => {
  // 1. Universal Scraper (Boot only)
  const runScrapersOnStartup = async () => {
    console.log('⏰ Running FULL startup scrape loop...');
    try {
      const sources = scraperRegistry.getAll();
      const results = await Promise.allSettled(
        sources.map((scraper) => scraper.scrape()) // No limit passed in
      );
      
      const allJobs: JobCreateInput[] = [];
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') allJobs.push(...res.value);
        else console.error(`❌ [Scraper: ${sources[i]?.name}] Error:`, res.reason);
      });
      await processJobs(allJobs);
    } catch (error) {
      console.error('❌ Startup scraper failed:', error);
    }
  };

  // 2. ATS Continuous Scraper (Every 2 hours)
  const runAtsScrapers = async () => {
    console.log('⏰ Running ATS 2-hour scraper cron...');
    try {
      // Get all except remotive
      const sources = scraperRegistry.getAll().filter(s => s.key !== 'remotive');
      const results = await Promise.allSettled(sources.map((s) => s.scrape()));
      
      const allJobs: JobCreateInput[] = [];
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') allJobs.push(...res.value);
        else console.error(`❌ [Scraper: ${sources[i]?.name}] Error:`, res.reason);
      });
      await processJobs(allJobs);
    } catch (error) {
      console.error('❌ ATS 2-hour scraper failed:', error);
    }
  };

  // 3. Remotive Daily Scraper (Every 1 day)
  const runRemotiveDaily = async () => {
    console.log('⏰ Running Remotive daily scraper cron...');
    try {
      const remotive = scraperRegistry.get('remotive');
      if (remotive) {
        const jobs = await remotive.scrape({ maxPages: 10 });
        await processJobs(jobs);
      }
    } catch (error) {
      console.error('❌ Remotive daily scraper failed:', error);
    }
  };

  // 4. Job Description Enrichment (Every 15 mins)
  const runEnrichment = async () => {
    console.log('⏰ Running job enrichment worker...');
    await runJobEnrichment();
  };

  // Schedule the recurring jobs (DISABLED)
  cron.schedule('0 */2 * * *', runAtsScrapers);    // Every 2 hours
  cron.schedule('0 0 * * *', runRemotiveDaily);    // Every day at midnight
  cron.schedule('*/15 * * * *', runEnrichment);   // Every 15 minutes
 
  // Run once on startup (DISABLED)
  setTimeout(runScrapersOnStartup, 5000);
  setTimeout(runEnrichment, 10000);

  // console.log('📅 Cron schedules disabled: Scrapers will not run automatically.');
};
