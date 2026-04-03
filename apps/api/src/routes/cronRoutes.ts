import express, { type Router } from 'express';
import { logInfo, logError } from '../lib/logger.js';
import { scraperRegistry } from '../scrapers/ScraperRegistry.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { CacheService } from '../lib/redis.js';
import type { JobCreateInput } from '@jobagg/shared';

const router: Router = express.Router();

// Middleware: Verify CRON_SECRET
const verifyCronSecret = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const secret = req.headers.authorization?.replace('Bearer ', '');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    logError('CRON_SECRET not configured');
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }

  if (secret !== expectedSecret) {
    logError('Invalid CRON_SECRET', { provided: secret?.slice(0, 5) });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Shared job processing logic
async function processJobs(jobsToSave: JobCreateInput[]) {
  const mappedJobs = jobsToSave.map((job) => ({
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
  await CacheService.bumpListCacheVersion();
  return { newOrUpdated, total: jobsToSave.length };
}

// LinkedIn scraper endpoint
router.get('/scrape-linkedin', verifyCronSecret, async (req, res) => {
  try {
    logInfo('Cron: Starting LinkedIn scraper');
    const linkedIn = scraperRegistry.get('linkedin');
    
    if (!linkedIn) {
      return res.status(500).json({ error: 'LinkedIn scraper not found' });
    }

    const results = await linkedIn.scrape();
    const processed = await processJobs(results);
    
    logInfo('Cron: LinkedIn scraper completed', { jobsCollected: results.length, ...processed });
    res.json({ 
      success: true, 
      jobsCollected: results.length,
      newOrUpdated: processed.newOrUpdated,
    });
  } catch (error) {
    logError('Cron: LinkedIn scraper failed', error as Error);
    res.status(500).json({ 
      error: 'LinkedIn scraper failed',
      message: String(error),
    });
  }
});

// API scrapers endpoint (Remotive, RemoteOK, HackerNews, WeWorkRemotely)
router.get('/scrape-api-jobs', verifyCronSecret, async (req, res) => {
  try {
    logInfo('Cron: Starting API scrapers');
    const apiScrapers = ['remotive', 'remoteok', 'hackernews', 'weWorkRemotely'];
    const sources = apiScrapers
      .map((key) => scraperRegistry.get(key))
      .filter((s) => s !== undefined) as any[];

    if (sources.length === 0) {
      return res.status(500).json({ error: 'No API scrapers found' });
    }

    const results = await Promise.allSettled(sources.map((s) => s.scrape()));

    const allJobs: JobCreateInput[] = [];
    const failedScrapers: string[] = [];

    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        allJobs.push(...res.value);
      } else {
        logError('Cron: API scraper failed', { scraper: sources[i]?.name, error: String(res.reason) });
        failedScrapers.push(sources[i]?.name || `scraper-${i}`);
      }
    });

    const processed = await processJobs(allJobs);

    logInfo('Cron: API scrapers completed', { 
      totalJobsCollected: allJobs.length, 
      sourceCount: sources.length,
      ...processed,
    });

    res.json({
      success: true,
      totalJobsCollected: allJobs.length,
      sourcesRun: sources.length,
      failedScrapers: failedScrapers.length > 0 ? failedScrapers : undefined,
      newOrUpdated: processed.newOrUpdated,
    });
  } catch (error) {
    logError('Cron: API scrapers failed', error as Error);
    res.status(500).json({ 
      error: 'API scrapers failed',
      message: String(error),
    });
  }
});

export default router;
