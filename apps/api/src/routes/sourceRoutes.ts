// ─── Source Routes ───────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { jobRepository } from '../repositories/JobRepository.js';
import { asyncErrorWrapper } from '../utils/index.js';
import { scraperRegistry } from '../scrapers/ScraperRegistry.js';
import { Job } from '../entities/Job.js';
import { config } from '../config/unifiedConfig.js';
import { CacheService } from '../lib/redis.js';

const router: Router = Router();

// Public routes
router.get(
  '/',
  asyncErrorWrapper(async (req: Request, res: Response) => {
    const sources = scraperRegistry.getAll();
    res.json({
      data: sources.map((s: any) => ({
        key: s.key,
        name: s.name,
      })),
    });
  }),
);

// Trigger Scraping Manually
router.post(
  '/scrape',
  asyncErrorWrapper(async (req: Request, res: Response) => {
    const configuredSecret = config.scrape.manualSecret;
    const providedSecret = req.headers['x-scrape-secret'];
    const parsedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;

    if (config.isProd && !configuredSecret) {
      res.status(503).json({
        data: null,
        error: {
          message: 'Manual scraping is disabled in production until SCRAPE_SECRET is configured.',
          code: 'SCRAPE_DISABLED',
        },
      });
      return;
    }

    if (configuredSecret && parsedSecret !== configuredSecret) {
      res.status(403).json({
        data: null,
        error: {
          message: 'Invalid scrape secret.',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    const sources = scraperRegistry.getAll();
    
    // Execute all scrapers in parallel
    const scrapePromises = sources.map(s => s.scrape());
    const results = await Promise.allSettled(scrapePromises);
    
    let totalScraped = 0;
    const allJobs: Partial<Job>[] = [];

    results.forEach((promiseResult, index) => {
      const source = sources[index];
      if (promiseResult.status === 'fulfilled') {
        const jobs = promiseResult.value;
        const mappedJobs: Partial<Job>[] = jobs.map(job => ({
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
        
        allJobs.push(...mappedJobs);
        totalScraped += mappedJobs.length;
        console.log(`[Scraper] ${source?.name ?? 'Unknown'} returned ${mappedJobs.length} jobs`);
      } else {
        console.error(`[Scraper] ${source?.name ?? 'Unknown'} failed:`, promiseResult.reason);
      }
    });

    if (allJobs.length > 0) {
      await jobRepository.upsertMany(allJobs);
      await CacheService.bumpListCacheVersion();
    }

    res.json({
      message: 'Scraping finished',
      totalJobs: totalScraped,
      newOrUpdated: allJobs.length
    });
  })
);

export { router as sourceRoutes };
