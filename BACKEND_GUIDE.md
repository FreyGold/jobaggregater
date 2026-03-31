# Job Aggregator Backend - Complete Educational Guide

**Level:** Beginner to Intermediate | **Focus:** Understanding production Node.js patterns

---

## Table of Contents

1. [Quick Start: What is This?](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Understanding the Layers](#understanding-the-layers)
4. [Request Flow: From Client to Database](#request-flow)
5. [Core Concepts Explained](#core-concepts)
6. [Best Practices Found Here](#best-practices)
7. [Areas for Improvement](#areas-for-improvement)
8. [Practical Code Examples](#practical-code-examples)

---

## Quick Start

### What is This API?

The Job Aggregator API is a **Node.js REST API** that:

- **Scrapes job listings** from LinkedIn, Indeed, Remotive, and other sources
- **Stores jobs** in a PostgreSQL database
- **Allows users to search, filter, and save** job listings
- **Manages authentication** with JWT tokens
- **Handles Stripe subscriptions** (FREE, PRO, ENTERPRISE plans)
- **Caches results** with Redis for performance
- **Runs automated scraping jobs** on a schedule

### Tech Stack

```
Frontend:           Next.js + React (apps/web)
Backend:            Node.js + Express + TypeScript (apps/api)
Database:           PostgreSQL (with TypeORM)
Cache:              Redis
Authentication:     JWT
Payments:           Stripe
Job Scheduling:     node-cron
```

---

## Architecture Overview

### High-Level Structure

```
CLIENT REQUEST (e.g., GET /api/jobs?keyword=frontend)
    ↓
MIDDLEWARE (CORS, Auth, Rate Limiting, Error Handling)
    ↓
ROUTES (Express Router - decide which controller to call)
    ↓
CONTROLLERS (Receive request, call services, return response)
    ↓
SERVICES (Business logic - rules, validations, decisions)
    ↓
REPOSITORIES (Data access - query the database)
    ↓
DATABASE (PostgreSQL stores actual data)
    ↓
RESPONSE sent back to client
```

### File Structure

```
apps/api/src/
├── server.ts                 # Entry point - starts the server
├── app.ts                    # Express setup, middleware configuration
├── config/                   # Configuration files
│   ├── unifiedConfig.ts      # Environment variables
│   └── data-source.ts        # TypeORM/Database connection
├── controllers/              # HTTP request handlers
│   ├── BaseController.ts     # Base class with response helpers
│   ├── AuthController.ts     # Registration, login
│   ├── JobController.ts      # Job searching, filtering
│   └── SubscriptionController.ts # Stripe webhooks, checkout
├── services/                 # Business logic
│   ├── authService.ts        # User registration/login logic
│   ├── jobService.ts         # Job filtering, caching
│   └── stripeService.ts      # Stripe integration
├── repositories/             # Database queries
│   ├── JobRepository.ts      # All job queries
│   ├── UserRepository.ts     # All user queries
│   └── SourceRepository.ts   # Scraping source queries
├── entities/                 # Data models (database tables)
│   ├── User.ts              # User table definition
│   ├── Job.ts               # Job table definition
│   ├── SavedJob.ts          # Saved jobs junction table
│   └── Source.ts            # Scraping sources table
├── middleware/               # Express middleware
│   ├── errorHandler.ts      # Global error handling
│   ├── authMiddleware.ts    # JWT authentication
│   └── rateLimitMiddleware.ts # Rate limiting
├── routes/                   # Route definitions
│   ├── authRoutes.ts        # /api/auth routes
│   ├── jobRoutes.ts         # /api/jobs routes
│   ├── subscriptionRoutes.ts # /api/subscriptions routes
│   └── sourceRoutes.ts      # /api/sources routes
├── lib/                      # Utilities
│   └── redis.ts             # Redis cache service
├── scrapers/                 # Web scraping logic
│   ├── LinkedInScraper.ts   # LinkedIn job scraper
│   ├── RemotiveScraper.ts   # Remotive API scraper
│   └── ScraperRegistry.ts   # Factory for scrapers
├── jobs/                     # Background jobs
│   └── scraperCron.ts       # Scheduled job runner
└── validators/               # Input validation schemas
    └── job.schema.ts        # Zod schemas for validation
```

---

## Understanding the Layers

### 1. Entities Layer (Database Models)

**Purpose:** Defines what data looks like and how it's stored

**Example: User Entity**

```typescript
// src/entities/User.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;  // Hashed password (never store plain text!)

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['FREE', 'PRO', 'ENTERPRISE'], default: 'FREE' })
  subscriptionPlan: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @OneToMany(() => SavedJob, savedJob => savedJob.user)
  savedJobs: SavedJob[];
}
```

**Key Concept:** `@Entity` = database table, `@Column` = column, `@OneToMany` = relationship

**Example: Job Entity**

```typescript
// src/entities/Job.ts
@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;  // "Senior Backend Engineer"

  @Column()
  company: string;  // "Google"

  @Column()
  location: string;  // "Remote"

  @Column({ nullable: true })
  salary: string;  // "100k-150k USD"

  @Column({ unique: true })
  url: string;  // Unique link to job posting

  @Column({ type: 'text' })
  description: string;  // Full job description

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];  // ["typescript", "nodejs", "api"]

  @Column({ type: 'boolean', default: false })
  isRemote: boolean;

  @Column({ type: 'timestamp', nullable: true })
  postedAt: Date;

  @Column()
  createdAt: Date;
}
```

---

### 2. Repository Layer (Data Access)

**Purpose:** All database queries live here. Controllers/Services never query the database directly.

**Why?** Makes it easy to change database logic without touching business logic.

**Example: JobRepository**

```typescript
// src/repositories/JobRepository.ts
import { AppDataSource } from '../config/data-source.js';
import { Job } from '../entities/Job.js';

export class JobRepository {
  private repo = AppDataSource.getRepository(Job);

  // Find jobs with filters
  async findMany(filters: JobFiltersInput) {
    const qb = this.repo.createQueryBuilder('job');

    // Build WHERE conditions dynamically
    if (filters.keyword) {
      qb.andWhere('(job.title ILIKE :keyword OR job.company ILIKE :keyword)', {
        keyword: `%${filters.keyword}%`,
      });
    }

    if (filters.location) {
      qb.andWhere('job.location ILIKE :location', {
        location: `%${filters.location}%`,
      });
    }

    if (filters.isRemote !== undefined) {
      qb.andWhere('job.isRemote = :isRemote', { isRemote: filters.isRemote });
    }

    // Sorting and pagination
    qb.orderBy(`job.postedAt`, 'DESC');
    qb.skip((filters.page - 1) * filters.limit);
    qb.take(filters.limit);

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total };
  }

  // Find single job by ID
  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  // Add multiple jobs (used by scrapers)
  async upsertMany(jobs: any[]) {
    for (const job of jobs) {
      await this.repo.upsert(job, ['url']);  // Don't create duplicate URLs
    }
  }
}
```

**Key Pattern:** TypeORM Query Builder allows SQL-like queries in TypeScript

```typescript
qb.createQueryBuilder('job')         // Reference entity as 'job'
  .where('job.title ILIKE :keyword') // Case-insensitive like
  .andWhere('job.isRemote = true')   // Can chain multiple conditions
  .orderBy('job.postedAt', 'DESC')   // Sort by date
  .skip(0)                           // Pagination skip
  .take(20)                          // Pagination take
  .getManyAndCount()                 // Get array + total count
```

---

### 3. Services Layer (Business Logic)

**Purpose:** Contains the "rules" of your application. All business decisions live here.

**Example: JobService**

```typescript
// src/services/jobService.ts
export class JobService {
  constructor(
    private jobRepository: JobRepository,
    private userRepository: UserRepository,
  ) {}

  async listJobs(filters: JobFiltersInput, userPlan: string = 'FREE') {
    // 1. Check cache first
    const cacheKey = `jobs:list:${userPlan}:${JSON.stringify(filters)}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;  // Return cached result

    // 2. Query database
    const { jobs, total } = await this.jobRepository.findMany(filters);

    // 3. Apply business rules based on subscription tier
    const SUBSCRIPTION_LIMITS = {
      FREE: 100,        // FREE users can see max 100 results
      PRO: 1000,        // PRO users can see max 1000
      ENTERPRISE: null, // ENTERPRISE users see everything
    };

    let effectiveJobs = jobs;
    if (userPlan === 'FREE' && total > 100) {
      effectiveJobs = jobs.slice(0, 100);  // Cap for FREE users
    }

    // 4. Cache result for 5 minutes
    const result = { data: effectiveJobs, meta: { total, page: filters.page } };
    await CacheService.set(cacheKey, result, 300);  // 300 = 5 minutes

    return result;
  }

  async saveJob(userId: string, jobId: string) {
    // Business logic: Check if job exists before saving
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Save to database
    return await this.userRepository.saveJob(userId, jobId);
  }
}
```

**Key Insight:** Services separate business logic from the database.

```
❌ BAD - Logic in controller:
Controller.save() → Check if job exists → Query DB → Return response

✅ GOOD - Logic in service:
Controller.save() → Service.save() → Repository.save() → Response
```

---

### 4. Controllers Layer (HTTP Handling)

**Purpose:** Receives HTTP requests, calls services, returns responses

**Example: JobController**

```typescript
// src/controllers/JobController.ts
export class JobController extends BaseController {
  constructor(private jobService: JobService) {
    super();
  }

  // GET /api/jobs?keyword=react&page=1
  async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Extract query parameters
      const { keyword, page = 1, limit = 20 } = req.query;

      // 2. Get user's subscription plan from JWT
      const userPlan = req.user?.subscriptionPlan || 'FREE';

      // 3. Call service
      const result = await this.jobService.listJobs(
        { keyword, page: Number(page), limit: Number(limit) },
        userPlan
      );

      // 4. Return response using helper
      this.handlePaginatedSuccess(res, result.data, result.meta);
    } catch (error) {
      next(error);  // Pass error to global error handler
    }
  }

  // GET /api/jobs/search?keyword=typescript
  async searchJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const { keyword } = req.query;
      const results = await this.jobService.search(keyword as string);
      this.handleSuccess(res, results);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/jobs/saved/:jobId (protected)
  async saveJob(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Validate user is authenticated
      if (!req.user?.id) {
        return this.handleError(
          new Error('Unauthorized'),
          res,
          'saveJob'
        );
      }

      // 2. Call service
      await this.jobService.saveJob(req.user.id, req.params.jobId);

      // 3. Return success
      this.handleSuccess(res, { saved: true }, 201);
    } catch (error) {
      next(error);
    }
  }
}
```

**Key Insight:** Controllers are thin. They:
- Extract data from request
- Call services
- Return response
- Let errors bubble to error handler

---

### 5. Middleware (Interceptors & Handlers)

**Purpose:** Runs code before/after every request

**Example: Authentication Middleware**

```typescript
// src/middleware/authMiddleware.ts
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Extract token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    // 2. Verify and decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    // 3. Attach user data to request object
    req.user = decoded as any;

    // 4. Continue to next middleware/route
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Usage in Routes:**

```typescript
// src/routes/jobRoutes.ts
router.post('/saved/:jobId', authMiddleware, jobController.saveJob);
// ↑ Runs authMiddleware BEFORE jobController.saveJob
```

**Example: Global Error Handler**

```typescript
// src/middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  console.error(`[${code}]`, err.message);

  res.status(statusCode).json({
    data: null,
    error: {
      message: err.message,
      code: code,
    },
  });
};
```

**Usage:**

```typescript
// Throw custom errors anywhere in your code
throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
// Error handler catches it automatically
```

---

### 6. Routes (URL Mapping)

**Purpose:** Define which controller method handles which URL

**Example:**

```typescript
// src/routes/jobRoutes.ts
import { Router } from 'express';
import { JobController } from '../controllers/JobController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
const jobController = new JobController(jobService);

// Public routes
router.get('/', jobController.listJobs);              // GET /api/jobs
router.get('/:id', jobController.getJob);             // GET /api/jobs/123
router.get('/search', jobController.searchJobs);      // GET /api/jobs/search?keyword=react

// Protected routes
router.post('/saved/:jobId', authMiddleware, jobController.saveJob);    // POST /api/jobs/saved/123
router.delete('/saved/:jobId', authMiddleware, jobController.unsaveJob); // DELETE /api/jobs/saved/123

export const jobRoutes = router;
```

---

## Request Flow

### Complete Example: GET /api/jobs?keyword=react

**Step 1: Request Arrives**
```
GET /api/jobs?keyword=react HTTP/1.1
Authorization: Bearer eyJhbGc...
```

**Step 2: Middleware Pipeline**
```
1. CORS Check ✓
2. JSON Parser ✓
3. Rate Limiter ✓
4. Database Ready Check ✓
5. Route Found: jobRoutes
```

**Step 3: Route Handler**
```typescript
// routes/jobRoutes.ts
router.get('/', jobController.listJobs);  // This handler is called
```

**Step 4: Controller Receives Request**
```typescript
// controllers/JobController.ts
async listJobs(req, res, next) {
  const { keyword, page } = req.query;  // keyword = "react"
  const userPlan = req.user?.subscriptionPlan || 'FREE';

  // Call service
  const result = await this.jobService.listJobs(
    { keyword, page: 1, limit: 20 },
    userPlan
  );

  // Send response
  this.handlePaginatedSuccess(res, result.data, result.meta);
}
```

**Step 5: Service Executes Business Logic**
```typescript
// services/jobService.ts
async listJobs(filters, userPlan) {
  // 1. Check cache
  const cached = await CacheService.get(`jobs:list:FREE:...`);
  if (cached) return cached;  // Cache hit!

  // 2. Query database
  const { jobs, total } = await this.jobRepository.findMany(filters);

  // 3. Apply subscription rules
  // FREE users capped at 100 results

  // 4. Cache result
  await CacheService.set(cacheKey, result, 300);

  return result;
}
```

**Step 6: Repository Queries Database**
```typescript
// repositories/JobRepository.ts
async findMany(filters) {
  const qb = this.repo.createQueryBuilder('job');
  qb.where('job.title ILIKE :keyword', { keyword: '%react%' });
  qb.orderBy('job.postedAt', 'DESC');
  qb.skip(0);
  qb.take(20);

  // Executes SQL:
  // SELECT * FROM jobs WHERE title ILIKE '%react%'
  // ORDER BY postedAt DESC LIMIT 20;

  return await qb.getManyAndCount();
}
```

**Step 7: Response Sent**
```json
{
  "data": [
    {
      "id": "123",
      "title": "Senior React Developer",
      "company": "Netflix",
      "location": "Remote",
      "isRemote": true,
      "postedAt": "2026-03-30T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "totalPages": 13,
    "hasMore": true
  }
}
```

---

## Core Concepts Explained

### 1. Dependency Injection

**Concept:** Instead of creating dependencies inside a class, pass them in.

```typescript
// ❌ BAD - Hard-coded dependency
class JobService {
  private jobRepository = new JobRepository();  // Can't test easily
}

// ✅ GOOD - Dependency injected
class JobService {
  constructor(private jobRepository: JobRepository) {}  // Passed in
}

// Usage:
const jobRepo = new JobRepository();
const jobService = new JobService(jobRepo);
```

**Why?** Makes code testable and flexible.

---

### 2. Repository Pattern

**Concept:** All database queries go through repositories, not directly from controllers.

```
Controller → Service → Repository → Database
            (logic)  (queries)
```

**Benefits:**
- Change database without changing controllers
- Easy to mock for testing
- Centralized query logic

---

### 3. Error Handling

**Concept:** Create custom errors, throw them anywhere, catch them globally.

```typescript
// Define custom error
class AppError extends Error {
  constructor(public statusCode: number, message: string, public code: string) {
    super(message);
  }
}

// Throw from service
async getJob(id: string) {
  const job = await this.jobRepository.findById(id);
  if (!job) {
    throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
  }
  return job;
}

// Catch globally in middleware
app.use((err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({ error: err.message });
});
```

---

### 4. Caching Strategy

**Purpose:** Reduce database load by storing frequently-accessed data

```typescript
// src/lib/redis.ts
class CacheService {
  // Store result for 5 minutes
  async set(key: string, value: any, ttlSeconds: number) {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  // Get from cache
  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Invalidate cache (bump version)
  async bumpListCacheVersion() {
    const version = await redis.incr('cache:list:version');
    return version;
  }
}
```

**Usage in Service:**

```typescript
async listJobs(filters, userPlan) {
  const cacheVersion = await CacheService.getListCacheVersion();
  const cacheKey = `jobs:list:v${cacheVersion}:${userPlan}:${JSON.stringify(filters)}`;

  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    console.log('Cache hit!');
    return cached;
  }

  // Not in cache, query database
  const result = await this.jobRepository.findMany(filters);

  // Store in cache for 5 minutes
  await CacheService.set(cacheKey, result, 300);

  return result;
}
```

**Cache Invalidation:** When scrapers add new jobs, they bump the version:

```typescript
await CacheService.bumpListCacheVersion();
// Old cache keys like "jobs:list:v1:..." become invalid
// New requests use "jobs:list:v2:..." (cache miss)
```

---

### 5. Subscription Tiers

**Concept:** Different users get different limits based on their plan.

```typescript
const SUBSCRIPTION_LIMITS = {
  FREE: {
    jobResultsPerPage: 100,      // Max 100 results
    requestsPerMinute: 60,
  },
  PRO: {
    jobResultsPerPage: 1000,
    requestsPerMinute: 300,
  },
  ENTERPRISE: {
    jobResultsPerPage: null,     // Unlimited
    requestsPerMinute: 1000,
  },
};

// In service
async listJobs(filters, userPlan) {
  const { jobs, total } = await this.jobRepository.findMany(filters);

  // Apply tier-based limit
  const limit = SUBSCRIPTION_LIMITS[userPlan].jobResultsPerPage;
  if (limit && total > limit) {
    return jobs.slice(0, limit);
  }

  return jobs;
}
```

---

### 6. JWT Authentication

**Concept:** After login, user receives a token. They send it with every request.

```typescript
// Register/Login - Generate Token
async register(email: string, password: string) {
  const user = await this.userRepository.create({ email, password });

  // Create JWT token (expires in 24 hours)
  const token = jwt.sign(
    { userId: user.id, email: user.email, plan: user.subscriptionPlan },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
}

// Middleware - Verify Token
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach user to request
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Usage in routes
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);  // req.user exists because middleware ran
});
```

---

## Best Practices Found Here

### ✅ 1. Layered Architecture

Code is organized into clear layers: Controllers → Services → Repositories → Database

**Why?** Easy to test, maintain, and change.

---

### ✅ 2. Error Handling

Custom errors are thrown from services and caught globally.

**Why?** Consistent error responses, easier debugging.

---

### ✅ 3. Dependency Injection

Services receive dependencies via constructor, not hardcoded.

**Why?** Testable, flexible, follows SOLID principles.

---

### ✅ 4. Caching Strategy

Redis caching with version bumping on data changes.

**Why?** Reduces database load, faster responses.

---

### ✅ 5. Type Safety

Full TypeScript with strict mode enabled.

**Why?** Catches errors at compile time, better IDE support.

---

### ✅ 6. Subscription Tiers

Business logic enforces limits per subscription level.

**Why?** Clean revenue model, users understand what they get.

---

### ✅ 7. Middleware Pipeline

CORS → JSON Parser → Auth → Rate Limiter → Error Handler

**Why?** Clean separation of concerns, reusable logic.

---

## Areas for Improvement

### 🔴 1. Salary Parsing (HIGH PRIORITY)

**Current Problem:**
```typescript
// Job.salary is a string: "100k-150k USD"
// Can't filter by numeric range

// JobRepository can't do:
qb.andWhere('job.salary >= 100000');  // ❌ salary is a string!
```

**Solution:** Split into `salaryMin` and `salaryMax` numeric fields

```typescript
// entities/Job.ts
@Column({ type: 'integer', nullable: true })
salaryMin: number;  // 100000

@Column({ type: 'integer', nullable: true })
salaryMax: number;  // 150000

@Column({ type: 'varchar', nullable: true })
salaryCurrency: string;  // "USD"

// Now queries work:
qb.andWhere('job.salaryMin >= :minSalary', { minSalary: 100000 });
qb.andWhere('job.salaryMax <= :maxSalary', { maxSalary: 150000 });
```

---

### 🔴 2. Request Validation (HIGH PRIORITY)

**Current:**
```typescript
// No validation on incoming data
async listJobs(req, res) {
  const { keyword, page } = req.query;
  // What if page = "abc"?
  // What if limit = 999999?
}
```

**Solution:** Use Zod schemas

```typescript
// validators/job.schema.ts
import { z } from 'zod';

export const listJobsSchema = z.object({
  keyword: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  isRemote: z.boolean().optional(),
});

// In controller
async listJobs(req, res, next) {
  try {
    // Validate input
    const { keyword, page, limit } = listJobsSchema.parse(req.query);

    // If we get here, data is valid
    const result = await this.jobService.listJobs({
      keyword, page, limit
    });

    res.json(result);
  } catch (error) {
    next(error);  // Validation error automatically handled
  }
}
```

---

### 🟠 3. Database N+1 Queries

**Current Problem:**

```typescript
// JobRepository.ts
async findMany(filters) {
  const jobs = await this.repo.find({ relations: ['company', 'source'] });

  // If 100 jobs returned, this runs 100+ additional queries:
  for (let job of jobs) {
    job.company.details;  // N additional queries!
  }
}
```

**Solution:** Use eager loading with query builder

```typescript
// Load all related data in ONE query
async findMany(filters) {
  const qb = this.repo.createQueryBuilder('job')
    .leftJoinAndSelect('job.company', 'company')
    .leftJoinAndSelect('job.source', 'source');

  return await qb.getMany();  // Only 1 query total
}
```

---

### 🟠 4. Logging

**Current:** Mostly `console.log()` statements

**Better:** Use structured logging with Winston or Pino

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('Job fetched', { jobId: '123', userId: 'user456' });
logger.error('Job not found', { jobId: '999', statusCode: 404 });
```

**Why?** Structured logs are easier to search, parse, and monitor in production.

---

### 🟠 5. Input Sanitization

**Current:** User input goes directly to database queries

**Problem:** SQL Injection risk (though TypeORM parameters help)

**Better:** Sanitize strings

```typescript
import DOMPurify from 'isomorphic-dompurify';

async searchJobs(keyword: string) {
  // Sanitize user input
  const sanitized = DOMPurify.sanitize(keyword);

  const result = await this.jobRepository.search(sanitized);
  return result;
}
```

---

### 🟡 6. Rate Limiting Per User

**Current:** Global rate limit for everyone

**Better:** Different limits per subscription tier

```typescript
// middleware/rateLimitMiddleware.ts
export const rateLimitMiddleware = (req, res, next) => {
  const userPlan = req.user?.subscriptionPlan || 'FREE';

  const limits = {
    FREE: 60,          // 60 requests per minute
    PRO: 300,          // 300 requests per minute
    ENTERPRISE: 1000,  // 1000 requests per minute
  };

  const limit = limits[userPlan];
  const key = `rate:${req.user?.id || req.ip}`;

  // Check against limit...
  next();
};
```

---

### 🟡 7. Async Job Queue

**Current:** Web scrapers run synchronously during cron interval

**Problem:** If a scraper hangs, others are blocked

**Better:** Use Bull or BullMQ for job queue

```typescript
// jobs/queue.ts
import Bull from 'bull';

const scrapingQueue = new Bull('scraping', process.env.REDIS_URL);

// Enqueue scraping job
scrapingQueue.add('linkedin', { pages: 2 }, {
  priority: 1,
  attempts: 3,  // Retry 3 times on failure
  backoff: { type: 'exponential', delay: 2000 },
});

// Process jobs in parallel
scrapingQueue.process('linkedin', 5, async (job) => {
  // Run LinkedIn scraper
  return await linkedInScraper.scrape();
});
```

**Why?** Each scraper runs independently, retries on failure.

---

### 🟡 8. API Documentation

**Current:** No OpenAPI/Swagger docs

**Better:** Use Swagger/OpenAPI

```typescript
// Automatically generate API docs
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Aggregator API',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  apis: ['./src/routes/*.ts'],  // Scan routes for JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Result:** `/api-docs` shows interactive API documentation

---

### 🟡 9. Environment Validation

**Current:** Silently uses defaults if env vars missing

**Better:** Fail fast with validation

```typescript
// config/unifiedConfig.ts
import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

const config = configSchema.parse(process.env);

// If any required var is missing, app crashes immediately
// This is GOOD - fail fast instead of silently breaking
```

---

### 🟢 10. Testing Setup

**Current:** No tests visible

**Better:** Add Jest tests

```typescript
// services/__tests__/jobService.test.ts
import { JobService } from '../jobService';

describe('JobService', () => {
  let jobService: JobService;
  let mockJobRepository: jest.Mocked<JobRepository>;

  beforeEach(() => {
    mockJobRepository = {
      findMany: jest.fn(),
    } as any;

    jobService = new JobService(mockJobRepository);
  });

  it('should return cached results on second call', async () => {
    mockJobRepository.findMany.mockResolvedValue({
      jobs: [{ id: '1', title: 'Dev' }],
      total: 1,
    });

    const result1 = await jobService.listJobs({ keyword: 'dev' });
    const result2 = await jobService.listJobs({ keyword: 'dev' });

    // Database only called once (second call used cache)
    expect(mockJobRepository.findMany).toHaveBeenCalledTimes(1);
  });
});
```

---

## Practical Code Examples

### Example 1: Create a New API Endpoint

**Goal:** Add GET `/api/jobs/trending` that returns most-saved jobs

**Step 1: Create Entity Relationship** (Already done - SavedJob exists)

**Step 2: Add Repository Query**

```typescript
// repositories/JobRepository.ts
async getTrendingJobs(limit: number = 10) {
  const qb = this.repo.createQueryBuilder('job')
    .leftJoinAndSelect('job.savedByUsers', 'savedBy')
    .select('job.*')
    .addSelect('COUNT(savedBy.id)', 'saveCount')
    .groupBy('job.id')
    .orderBy('saveCount', 'DESC')
    .limit(limit);

  return await qb.getRawMany();
}
```

**Step 3: Add Service Method**

```typescript
// services/jobService.ts
async getTrendingJobs() {
  const cacheKey = 'jobs:trending';
  const cached = await CacheService.get(cacheKey);
  if (cached) return cached;

  const jobs = await this.jobRepository.getTrendingJobs(10);
  await CacheService.set(cacheKey, jobs, 600);  // Cache 10 minutes

  return jobs;
}
```

**Step 4: Add Controller Method**

```typescript
// controllers/JobController.ts
async getTrendingJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const jobs = await this.jobService.getTrendingJobs();
    this.handleSuccess(res, jobs);
  } catch (error) {
    next(error);
  }
}
```

**Step 5: Add Route**

```typescript
// routes/jobRoutes.ts
router.get('/trending', jobController.getTrendingJobs);
```

**Step 6: Test**

```bash
curl http://localhost:3000/api/jobs/trending
```

---

### Example 2: Add Subscription Check to Route

**Goal:** Only PRO users can see jobs from the last 7 days

**Step 1: Modify Repository**

```typescript
// repositories/JobRepository.ts
async findMany(filters: JobFiltersInput) {
  const qb = this.repo.createQueryBuilder('job');

  // If user wants recent jobs but is FREE tier, reject
  if (filters.daysOld === 7 && filters.userPlan === 'FREE') {
    throw new AppError(
      403,
      'Feature available for PRO users only',
      'FEATURE_LOCKED'
    );
  }

  if (filters.daysOld) {
    const daysAgo = new Date(Date.now() - filters.daysOld * 86400000);
    qb.andWhere('job.postedAt >= :daysAgo', { daysAgo });
  }

  return await qb.getManyAndCount();
}
```

**Step 2: Pass Plan to Service**

```typescript
// services/jobService.ts
async listJobs(filters, userPlan) {
  const enhancedFilters = { ...filters, userPlan };
  return await this.jobRepository.findMany(enhancedFilters);
}
```

**Step 3: Test**

```bash
# FREE user - returns error
curl -H "Authorization: Bearer FREE_TOKEN" \
  http://localhost:3000/api/jobs?daysOld=7

# PRO user - works
curl -H "Authorization: Bearer PRO_TOKEN" \
  http://localhost:3000/api/jobs?daysOld=7
```

---

### Example 3: Add Logging

**Goal:** Log when jobs are saved

**Step 1: Inject Logger**

```typescript
// services/jobService.ts
import { logger } from '../lib/logger';

export class JobService {
  async saveJob(userId: string, jobId: string) {
    logger.info('Job save initiated', { userId, jobId });

    try {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        logger.warn('Attempted to save non-existent job', { jobId });
        throw new AppError(404, 'Job not found', 'JOB_NOT_FOUND');
      }

      await this.userRepository.saveJob(userId, jobId);
      logger.info('Job saved successfully', { userId, jobId });

      return { saved: true };
    } catch (error) {
      logger.error('Failed to save job', {
        userId,
        jobId,
        error: error.message,
      });
      throw error;
    }
  }
}
```

**Result:** Logs appear in `combined.log` and `error.log`

---

## Summary: What You Now Understand

✅ **Layered Architecture** - Controllers → Services → Repositories → Database

✅ **Request Flow** - How a request travels through middleware and layers

✅ **Dependency Injection** - Passing dependencies instead of hardcoding

✅ **Error Handling** - Custom errors caught globally

✅ **Caching** - Redis caching with version bumping

✅ **Authentication** - JWT tokens for protected routes

✅ **Subscriptions** - Tier-based limits on features

✅ **Best Practices** - Type safety, separation of concerns, testability

✅ **Improvements** - What to fix next (salary parsing, validation, N+1 queries)

---

## Next Steps

1. **Add Request Validation** using Zod schemas
2. **Fix Salary Parsing** by adding numeric min/max fields
3. **Add Unit Tests** for services
4. **Implement Logging** with Winston
5. **Add API Documentation** with Swagger
6. **Optimize N+1 Queries** with better eager loading
7. **Add Rate Limiting Per User** based on subscription tier
8. **Use Job Queue** for scrapers instead of synchronous execution

---

## Useful Resources

- **Express.js:** https://expressjs.com/
- **TypeORM:** https://typeorm.io/
- **Zod Validation:** https://zod.dev/
- **JWT.io:** https://jwt.io/
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices

