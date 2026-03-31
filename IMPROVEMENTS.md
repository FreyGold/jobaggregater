# Job Aggregator API - Improvements & Recommendations

This file outlines concrete improvements to make the API production-ready.

---

## Priority Matrix

| Priority | Issue | Impact | Effort | Status |
|----------|-------|--------|--------|--------|
| 🔴 P0 | Salary parsing (string vs numeric) | Filtering broken | 2 hours | Not started |
| 🔴 P0 | Input validation missing | Security risk | 3 hours | Not started |
| 🟠 P1 | N+1 query problem | Database load | 2 hours | Not started |
| 🟠 P1 | No structured logging | Debugging hard | 1 hour | Not started |
| 🟡 P2 | No API documentation | User confusion | 2 hours | Not started |
| 🟡 P2 | Rate limiting not per-user | Unfair to PRO users | 1 hour | Not started |
| 🟢 P3 | No unit tests | Can't refactor safely | 4 hours | Not started |
| 🟢 P3 | Async job queue missing | Scrapers can hang | 3 hours | Not started |

---

## P0: Salary Parsing

### Problem

```typescript
// Current: salary is a string
job.salary = "100k-150k USD"

// Can't query:
SELECT * FROM jobs WHERE salary > 100000;  // ❌ salary is VARCHAR
```

### Solution

**Step 1: Add numeric columns to Job entity**

```typescript
// src/entities/Job.ts
@Entity('jobs')
export class Job {
  // ... existing columns ...

  @Column({ type: 'integer', nullable: true })
  salaryMin: number;  // e.g., 100000

  @Column({ type: 'integer', nullable: true })
  salaryMax: number;  // e.g., 150000

  @Column({ type: 'varchar', length: 10, nullable: true })
  salaryCurrency: string;  // e.g., "USD"

  @Column({ type: 'varchar', nullable: true })
  salaryRaw: string;  // Keep original "100k-150k USD" for display
}
```

**Step 2: Create database migration**

```bash
cd apps/api
npm run typeorm migration:generate -- src/migrations/AddSalaryNumeric
```

**Step 3: Update scrapers to parse salary**

```typescript
// src/utils/salaryParser.ts
export function parseSalary(salaryString: string): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  if (!salaryString) return { min: null, max: null, currency: null };

  // Extract currency
  const currencyMatch = salaryString.match(/USD|EUR|GBP|AED|SAR/i);
  const currency = currencyMatch?.[0] || 'USD';

  // Extract numbers (handle k/K for thousands)
  const numbers = salaryString.match(/\d+k?/gi) || [];
  const parsed = numbers.map(n => {
    const num = parseInt(n.replace(/k/i, '000'));
    return num;
  });

  return {
    min: parsed[0] || null,
    max: parsed[1] || parsed[0] || null,
    currency,
  };
}
```

**Step 4: Update JobRepository to enable filtering**

```typescript
// src/repositories/JobRepository.ts
async findMany(filters: JobFiltersInput) {
  const qb = this.repo.createQueryBuilder('job');

  if (filters.salaryMin) {
    qb.andWhere('job.salaryMax >= :salaryMin', { salaryMin: filters.salaryMin });
  }

  if (filters.salaryMax) {
    qb.andWhere('job.salaryMin <= :salaryMax', { salaryMax: filters.salaryMax });
  }

  if (filters.salaryCurrency) {
    qb.andWhere('job.salaryCurrency = :currency', { currency: filters.salaryCurrency });
  }

  // ... rest of query
  return await qb.getManyAndCount();
}
```

**Time: 2 hours** | **Effort: Medium**

---

## P0: Input Validation

### Problem

```typescript
// No validation - user can send anything
GET /api/jobs?page=abc&limit=999999&keyword=<script>alert('xss')</script>
```

### Solution

**Step 1: Create Zod schemas**

```typescript
// src/validators/job.schema.ts
import { z } from 'zod';

export const listJobsSchema = z.object({
  keyword: z.string().max(100).optional(),
  location: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['postedAt', 'salaryMin', 'title', 'company']).default('postedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  salaryMin: z.coerce.number().int().optional(),
  salaryMax: z.coerce.number().int().optional(),
  isRemote: z.boolean().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).optional(),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'EXECUTIVE']).optional(),
});

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  name: z.string().min(1).max(255),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
```

**Step 2: Create validation middleware**

```typescript
// src/middleware/validateRequest.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        ...req.query,
        ...req.body,
        ...req.params,
      });

      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};
```

**Step 3: Use in routes**

```typescript
// src/routes/jobRoutes.ts
import { validate } from '../middleware/validateRequest';
import { listJobsSchema } from '../validators/job.schema';

router.get('/', validate(listJobsSchema), jobController.listJobs);
// Now req.validated contains validated/sanitized data

// In controller:
async listJobs(req: Request, res: Response, next: NextFunction) {
  const filters = req.validated;  // Already validated and typed
  const result = await this.jobService.listJobs(filters);
  this.handlePaginatedSuccess(res, result.data, result.meta);
}
```

**Time: 3 hours** | **Effort: Medium**

---

## P1: N+1 Queries

### Problem

```typescript
// Current code
const jobs = await this.repo.find();
for (let job of jobs) {
  console.log(job.company.name);  // ❌ 100 additional queries for 100 jobs!
}
```

### Solution

**Use eager loading in Query Builder**

```typescript
// src/repositories/JobRepository.ts
async findMany(filters: JobFiltersInput) {
  const qb = this.repo.createQueryBuilder('job')
    // Load related data in same query
    .leftJoinAndSelect('job.company', 'company')
    .leftJoinAndSelect('job.source', 'source')
    .leftJoinAndSelect('job.savedByUsers', 'savedBy');

  // ... filters ...

  // Single query fetches everything
  return await qb.getManyAndCount();
}

async findById(id: string) {
  return this.repo.findOne({
    where: { id },
    relations: ['company', 'source'],  // Load relations
  });
}
```

**Result:** Instead of 101 queries (1 for jobs + 100 for companies), now 1 query with JOIN

**Time: 2 hours** | **Effort: Low-Medium**

---

## P1: Structured Logging

### Problem

```typescript
console.log('✅ Scrape batch processed ${newOrUpdated} jobs.');
// Hard to parse, search, monitor
```

### Solution

**Step 1: Set up Winston logger**

```bash
npm install winston
```

```typescript
// src/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),  // Structured JSON output
  ),
  defaultMeta: { service: 'job-aggregator-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}
```

**Step 2: Use throughout app**

```typescript
// src/services/jobService.ts
import { logger } from '../lib/logger';

async listJobs(filters, userPlan) {
  logger.info('Listing jobs', {
    filters,
    userPlan,
    timestamp: new Date().toISOString(),
  });

  try {
    const result = await this.jobRepository.findMany(filters);
    logger.debug('Jobs retrieved', { count: result.jobs.length });
    return result;
  } catch (error) {
    logger.error('Failed to list jobs', {
      error: error.message,
      stack: error.stack,
      filters,
    });
    throw error;
  }
}
```

**Result:** Logs are JSON, easily parseable by monitoring tools (DataDog, ELK, CloudWatch)

**Time: 1 hour** | **Effort: Low**

---

## P2: API Documentation

### Solution

**Step 1: Install Swagger packages**

```bash
npm install swagger-ui-express swagger-jsdoc
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
```

**Step 2: Create Swagger config**

```typescript
// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Aggregator API',
      version: '1.0.0',
      description: 'RESTful API for aggregating job listings',
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Development' },
      { url: 'https://api.jobagg.com/api', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],  // Scan JSDoc comments
};

export const swaggerSpec = swaggerJsdoc(options);
```

**Step 3: Add JSDoc comments to routes**

```typescript
// src/routes/jobRoutes.ts

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: List all jobs
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                 meta:
 *                   type: object
 */
router.get('/', jobController.listJobs);
```

**Step 4: Mount in Express**

```typescript
// src/app.ts
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Result:** Visit `http://localhost:3000/api-docs` for interactive documentation

**Time: 2 hours** | **Effort: Low**

---

## P2: Per-User Rate Limiting

### Current

```typescript
// Global rate limit: everyone 60 req/min
const limiter = rateLimit({ windowMs: 60000, max: 60 });
app.use(limiter);
```

### Solution

```typescript
// src/middleware/rateLimitMiddleware.ts
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient(process.env.REDIS_URL);

const tierLimits = {
  FREE: 60,
  PRO: 300,
  ENTERPRISE: 1000,
};

export const rateLimitMiddleware = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:',
  }),
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limit for health check
    return req.path === '/health';
  },
  max: (req) => {
    // Apply tier-based limit
    const plan = req.user?.subscriptionPlan || 'FREE';
    return tierLimits[plan];
  },
  message: 'Too many requests, please try again later',
});
```

**Time: 1 hour** | **Effort: Low**

---

## P3: Unit Tests

### Setup

```bash
npm install -D jest @types/jest ts-jest
npx jest --init
```

### Example Tests

```typescript
// src/services/__tests__/jobService.test.ts
import { JobService } from '../jobService';
import { JobRepository } from '../../repositories/JobRepository';

describe('JobService', () => {
  let jobService: JobService;
  let mockJobRepository: jest.Mocked<JobRepository>;

  beforeEach(() => {
    // Mock the repository
    mockJobRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      upsertMany: jest.fn(),
    } as any;

    jobService = new JobService(mockJobRepository);
  });

  describe('listJobs', () => {
    it('should return jobs from repository', async () => {
      mockJobRepository.findMany.mockResolvedValue({
        jobs: [{ id: '1', title: 'Dev' }],
        total: 1,
      });

      const result = await jobService.listJobs({ keyword: 'dev' });

      expect(result.data).toHaveLength(1);
      expect(mockJobRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'dev' })
      );
    });

    it('should cache results', async () => {
      mockJobRepository.findMany.mockResolvedValue({
        jobs: [],
        total: 0,
      });

      // Call twice
      await jobService.listJobs({ keyword: 'dev' });
      await jobService.listJobs({ keyword: 'dev' });

      // Repository should only be called once (second used cache)
      expect(mockJobRepository.findMany).toHaveBeenCalledTimes(1);
    });

    it('should enforce FREE tier limit', async () => {
      mockJobRepository.findMany.mockResolvedValue({
        jobs: Array(150).fill({ id: '1' }),  // 150 results
        total: 150,
      });

      const result = await jobService.listJobs({}, 'FREE');

      // FREE tier capped at 100
      expect(result.data).toHaveLength(100);
    });
  });
});
```

**Run tests:**

```bash
npm test
npm test -- --coverage  # See code coverage
```

**Time: 4 hours** | **Effort: Medium**

---

## P3: Async Job Queue

### Problem

```typescript
// Current: All scrapers run synchronously
Promise.allSettled([
  linkedinScraper.scrape(),   // Takes 10 minutes
  remotiveScraper.scrape(),   // Blocked for 10 minutes!
]);
```

### Solution

**Step 1: Install Bull**

```bash
npm install bull
npm install -D @types/bull
```

**Step 2: Create queue**

```typescript
// src/lib/scrapingQueue.ts
import Bull from 'bull';
import { linkedinScraper } from '../scrapers/LinkedInScraper';
import { remotiveScraper } from '../scrapers/RemotiveScraper';

export const scrapingQueue = new Bull('scraping', {
  redis: { url: process.env.REDIS_URL },
});

// Process LinkedIn jobs (up to 5 in parallel)
scrapingQueue.process('linkedin', 5, async (job) => {
  console.log('Starting LinkedIn scrape...');
  const jobs = await linkedinScraper.scrape();
  return { scraped: jobs.length };
});

// Process Remotive jobs
scrapingQueue.process('remotive', 3, async (job) => {
  const jobs = await remotiveScraper.scrape();
  return { scraped: jobs.length };
});

// Handle failures
scrapingQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed: ${error.message}`);
});
```

**Step 3: Enqueue jobs instead of running synchronously**

```typescript
// src/jobs/scraperCron.ts - BEFORE
const runAllScrapers = async () => {
  const results = await Promise.allSettled([
    linkedinScraper.scrape(),
    remotiveScraper.scrape(),
  ]);
};

// AFTER
const runAllScrapers = async () => {
  // Enqueue jobs, return immediately
  await scrapingQueue.add('linkedin', { pages: 2 }, {
    priority: 1,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  await scrapingQueue.add('remotive', {}, {
    priority: 2,
    attempts: 3,
  });

  console.log('Scraping jobs enqueued, workers processing...');
};
```

**Result:**
- Scrapers run in parallel as separate workers
- Each scraper can fail independently with retries
- Cron job completes in milliseconds (just enqueues)
- Monitor queue status: `scrapingQueue.count()`, `scrapingQueue.getActiveCount()`

**Time: 3 hours** | **Effort: Medium**

---

## Implementation Order

**Week 1: Critical fixes**
1. ✅ Salary parsing (P0)
2. ✅ Input validation (P0)

**Week 2: Performance & Developer Experience**
3. N+1 queries (P1)
4. Structured logging (P1)

**Week 3: Polish & Documentation**
5. API documentation (P2)
6. Per-user rate limiting (P2)

**Week 4: Quality & Resilience**
7. Unit tests (P3)
8. Async job queue (P3)

---

## Estimated Timeline

- **P0:** 5 hours (2 days)
- **P1:** 3 hours (1 day)
- **P2:** 3 hours (1 day)
- **P3:** 7 hours (2 days)

**Total:** ~18 hours (1 sprint)

---

## Checklist

- [ ] Salary parsing implemented and tested
- [ ] Input validation in place with Zod
- [ ] N+1 queries fixed with eager loading
- [ ] Structured logging deployed
- [ ] API documentation generated
- [ ] Per-user rate limiting working
- [ ] Unit tests with 80%+ coverage
- [ ] Async job queue processing scrapers
- [ ] All tests passing
- [ ] Code reviewed and merged

