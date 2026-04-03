import 'dotenv/config';
import { AppDataSource, initializeDatabase } from '../config/data-source.js';
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

async function runLinkedInScraper() {
  logInfo('Starting LinkedIn scraper CLI');
  try {
    const linkedIn = scraperRegistry.get('linkedin');
    if (linkedIn) {
      const results = await linkedIn.scrape();
      await processJobs(results);
      logInfo('LinkedIn scraper CLI completed', { jobsCollected: results.length });
    }
  } catch (error) {
    logError('LinkedIn scraper CLI failed', error as Error);
    process.exit(1);
  }
}

async function runAPIScraper() {
  logInfo('Starting API scraper CLI');
  try {
    const apiScrapers = ['remotive', 'remoteok', 'hackernews', 'weWorkRemotely'];
    const sources = apiScrapers
      .map((key) => scraperRegistry.get(key))
      .filter((s) => s !== undefined) as any[];
    
    const results = await Promise.allSettled(sources.map((s) => s.scrape()));

    const allJobs: JobCreateInput[] = [];
    let hasError = false;
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        allJobs.push(...res.value);
      } else {
        logWarn('API scraper failed', { scraper: sources[i]?.name, error: String(res.reason) });
        hasError = true;
      }
    });
    
    await processJobs(allJobs);
    logInfo('API scraper CLI completed', { totalJobsCollected: allJobs.length, sourceCount: sources.length });
    
    if (hasError) {
      logWarn('API scraper CLI completed with some errors');
      process.exit(1); // Exit with error if any scraper fails
    }
  } catch (error) {
    logError('API scraper CLI failed', error as Error);
    process.exit(1);
  }
}

async function main() {
  const target = process.argv[2];
  
  if (!target || !['linkedin', 'api'].includes(target)) {
    console.error('Usage: tsx runScraperCli.ts <linkedin|api>');
    process.exit(1);
  }

  await initializeDatabase();

  if (target === 'linkedin') {
    await runLinkedInScraper();
  } else if (target === 'api') {
    await runAPIScraper();
  }

  // Close database connection
  await AppDataSource.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in scraper CLI:', err);
  process.exit(1);
});
