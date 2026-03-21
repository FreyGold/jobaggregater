# JobAgg DB Request Budget Plan

Date: 2026-03-21  
Project root: `/home/frey/Visual Studio Code/jobaggregator`  
Scope reviewed: `apps/api` and `apps/web`

## 1) Goal and Constraint

Primary goal: drastically reduce database request count and keep total usage safely under a **100,000 DB request budget**.

Optimization preference from product direction:
- Favor **aggressive caching**.
- Favor **larger payloads / fewer round-trips**.
- Produce a plan with enough context for another model to continue implementation without re-discovery.

---

## 2) Current Architecture Snapshot

## API
- Stack: Express + TypeORM + Postgres + optional Redis cache.
- Entry points:
  - `apps/api/src/server.ts`
  - `apps/api/src/app.ts`
- DB layer:
  - `apps/api/src/repositories/JobRepository.ts`
  - `apps/api/src/repositories/UserRepository.ts`
  - `apps/api/src/config/data-source.ts`
- Cache layer:
  - `apps/api/src/lib/redis.ts`

## Web
- Stack: Next.js App Router + TanStack React Query.
- API wrapper:
  - `apps/web/src/lib/api.ts`
- Query defaults:
  - `apps/web/src/providers/query-provider.tsx`
- Main data hooks:
  - `apps/web/src/hooks/use-jobs.ts`
  - `apps/web/src/hooks/use-subscription.ts`
  - `apps/web/src/hooks/use-auth.ts`

---

## 3) High-Impact Findings (Request Volume Risk)

## Critical Risk A: Scraper Upserts Are 1 DB Request Per Job
File: `apps/api/src/repositories/JobRepository.ts` (`upsertMany`)

Current behavior:
- Uses `Promise.allSettled(jobs.map(... insert ... orUpdate ... execute()))`
- This means **one DB query per job row**.

Why this is dangerous:
- Scrapers can produce high volumes.
- A single large scrape can consume a major portion of a 100k request budget.

Observed volume context:
- `LinkedInScraper` loops countries × categories × pages (high potential output).
- Other scrapers also paginate heavily.

Impact level: **Extreme**

---

## Critical Risk B: Public Manual Scrape Endpoint Can Trigger Massive Writes
File: `apps/api/src/routes/sourceRoutes.ts` (`POST /api/sources/scrape`)

Current behavior:
- Public endpoint (no auth/secret guard).
- Runs all scrapers and writes all results.

Why this is dangerous:
- Any repeated trigger can burn DB request budget quickly.

Impact level: **Extreme**

---

## High Risk C: Repeated User-Plan DB Lookup on Job Listing
File: `apps/api/src/controllers/JobController.ts` (`listJobs`)

Current behavior:
- For authenticated users, every list request calls `userRepo.findById(...)` to determine plan.

Why this matters:
- Browsing/pagination = repeated queries.
- Avoidable by token claim or cached plan.

Impact level: **High**

---

## High Risk D: Cache Exists but Is Optional/Best-Effort (Can Be Effectively Off)
File: `apps/api/src/lib/redis.ts`

Current behavior:
- If `REDIS_URL` not configured, cache is disabled silently (`redisClient = null`).

Why this matters:
- DB request reduction strategy depends on cache.
- If cache is off in production, request volume spikes.

Impact level: **High**

---

## Medium Risk E: React Query Refetch + Low Stale Window on Frequently Mounted Data
Files:
- `apps/web/src/providers/query-provider.tsx` (default `staleTime=1m`)
- `apps/web/src/hooks/use-subscription.ts` (`useCurrentSubscription` no custom staleTime)
- `apps/web/src/components/layout/Header.tsx` (calls `useCurrentSubscription` globally)

Why this matters:
- Header mounts broadly.
- Subscription endpoint calls DB (`findByIdFull` in subscription flow).
- Frequent revalidation can cause avoidable DB reads.

Impact level: **Medium**

---

## Medium Risk F: Saved Jobs Query Called in Jobs Page Regardless of Auth
Files:
- `apps/web/src/hooks/use-jobs.ts` (`useSavedJobs` always enabled)
- `apps/web/src/app/jobs/page.tsx` (always uses hook)

Why this matters:
- Unauthenticated users still trigger `/api/jobs/saved/list` requests (401 path).
- Not DB-heavy (fails in auth middleware), but increases API churn and rate budget.

Impact level: **Medium**

---

## Medium Risk G: Non-Canonical Cache Keys + Expensive `delPattern(keys)`
Files:
- `apps/api/src/services/jobService.ts` (cache key = `JSON.stringify(filters)`)
- `apps/api/src/lib/redis.ts` (`delPattern` uses `KEYS`)
- `apps/api/src/jobs/scraperCron.ts` (`delPattern('jobs:list:*')`)

Why this matters:
- Key variance can reduce hit rate.
- `KEYS` does full scan and does not scale.

Impact level: **Medium**

---

## 4) Key Inconsistencies to Resolve Early

## Free-tier cap mismatch
- `packages/shared/src/constants/index.ts`: FREE `jobResultsPerPage = 40`
- `apps/api/src/services/stripeService.ts` plan response says FREE limit `100`

Need single source-of-truth; mismatch causes confusion and inconsistent client behavior.

## Route/API usage inconsistency in web auth pages
Files:
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/register/page.tsx`
- `apps/web/src/app/bookmarks/page.tsx`

These use direct hardcoded `fetch('http://localhost:3001/...')` rather than shared API client and React Query.

---

## 5) Prioritized Execution Plan

## Phase 0: Guardrails and Visibility (Do First)
Target: prevent catastrophic budget burn + baseline measurement.

1. Lock down manual scrape endpoint.
- File: `apps/api/src/routes/sourceRoutes.ts`
- Add one of:
  - Admin auth middleware.
  - Internal secret header check.
  - Disable in production behind env flag.
- Acceptance:
  - Unauthenticated/public scrape trigger blocked in production.

2. Add request budget telemetry.
- Add structured counters for:
  - DB query count per endpoint.
  - Cache hit/miss by key family.
  - Top 10 endpoints by DB calls.
- Lightweight implementation options:
  - Custom TypeORM logger wrapper (count queries).
  - Per-request context + post-response logging.
- Acceptance:
  - Can answer: “How many DB queries did `/api/jobs` generate in last hour/day?”

3. Make cache health explicit at boot.
- File: `apps/api/src/lib/redis.ts` and startup logs.
- Log clear warning if Redis is unavailable.
- Production policy recommendation: fail fast or strong warning gate when cache is required.

---

## Phase 1: Biggest DB Request Reduction (Write Path)
Target: eliminate per-row write queries.

1. Replace row-by-row `upsertMany` with chunked bulk upsert.
- File: `apps/api/src/repositories/JobRepository.ts`
- Strategy:
  - Deduplicate input by `url` in memory before DB.
  - Chunk values (e.g., 500–2000 rows/chunk depending on payload size).
  - Execute one upsert query per chunk, not per row.
  - Return inserted/updated counts.

Pseudo-shape:
```ts
for (const batch of chunk(uniqueJobs, 1000)) {
  await repo.createQueryBuilder()
    .insert()
    .into(Job)
    .values(batch)
    .orUpdate(['title','description','salary','updatedAt','postedAt','tags','employmentType','experienceLevel','isRemote'], ['url'])
    .execute();
}
```

2. Add “changed-fields only” update behavior where practical.
- Goal: avoid rewriting unchanged rows on every scrape.
- Option A: include `WHERE` clause on conflict update if changed (raw SQL may be needed).
- Option B: accept regular conflict updates initially, optimize later.

3. Keep cache invalidation but avoid `KEYS` scans.
- Move from pattern deletion to versioned key namespace:
  - Example key family: `jobs:list:v{version}:{normalizedFilters}:{plan}`
  - On scrape update, increment `jobs:list:version` instead of deleting all keys.

Expected impact:
- Massive drop in DB requests during ingest (often 10x–100x depending scrape size).

---

## Phase 2: Read Path Caching + Large Payload Strategy
Target: fewer list/read requests and higher cache hit rate.

1. Normalize list cache keys.
- File: `apps/api/src/services/jobService.ts`
- Build deterministic key from sorted filter entries and defaults.
- Avoid raw `JSON.stringify(req.query)` variance.

2. Increase list cache TTL.
- Current list TTL = 60s.
- Suggested: 5–15 minutes for job listing pages (depending freshness target).
- Since scraper cron already invalidates list caches, TTL can be longer safely.

3. Split count cache from page-data cache.
- `getManyAndCount` executes count each call.
- Cache total count by filter-without-page (e.g., 2–5 min).
- Cache page data separately.

4. Send larger pages from web by default.
- Current default limit = 20 on web.
- Increase default request limit (suggest 40 or 100 after free-tier decision).
- Fewer pagination requests means fewer DB hits.

5. Add HTTP cache headers for public GET endpoints.
- Endpoints: `/api/jobs`, `/api/jobs/:id`, `/api/subscriptions/plans`, `/api/sources`
- Add `Cache-Control` and ETag/Last-Modified where suitable.
- This enables browser/CDN request suppression before app-level handling.

---

## Phase 3: Avoidable DB Reads in Authenticated Browsing
Target: reduce repeated “who is this user plan” DB calls.

1. Put subscription plan in JWT claim at login/register.
- Files:
  - `apps/api/src/services/authService.ts`
  - `apps/api/src/middleware/authMiddleware.ts`
  - types for `req.user`
- On auth, trust token plan for normal list requests.
- On plan changes (Stripe webhook), either:
  - rotate token on next user action, or
  - keep short-lived claim + refresh policy.

2. Alternative if JWT plan not preferred: Redis plan cache.
- Cache `user:{id}:plan` TTL 15–60 min.
- Invalidate on subscription updates.

3. Cache `/api/subscriptions/current` response.
- Short TTL (e.g., 5 min) per user.
- Invalidate on webhook events.

---

## Phase 4: Web Request Churn Cleanup
Target: stop unnecessary API calls and maximize client caching.

1. Gate saved-jobs query by auth token.
- File: `apps/web/src/hooks/use-jobs.ts`
- `enabled: !!apiClient.getToken()`

2. Increase React Query stale/gc windows for stable resources.
- File: `apps/web/src/providers/query-provider.tsx`
- Suggested defaults:
  - `staleTime`: 5 min (global)
  - `gcTime`: 30–60 min
- Per-query overrides:
  - `/subscriptions/current`: 15–30 min
  - `/jobs/:id`: 10–30 min

3. Standardize on shared API client + React Query.
- Files:
  - `apps/web/src/app/login/page.tsx`
  - `apps/web/src/app/register/page.tsx`
  - `apps/web/src/app/bookmarks/page.tsx`
- Remove hardcoded localhost fetches.
- Benefit: centralized headers/token/error handling and better caching behavior.

4. Large-request default on jobs page.
- File: `apps/web/src/app/jobs/page.tsx`
- Set `limit` default to larger value (aligned with finalized tier rules).

---

## Phase 5: DB Index and Query Shape Tune (After Metrics)
Target: lower DB effort per request; not always reducing raw query count, but prevents expensive queries.

1. Validate indexes against most-used filters.
- Existing indexes are present on many columns in `Job` entity.
- Add composite indexes if query plans show need, e.g.:
  - `(postedAt DESC, isRemote, employmentType, experienceLevel)`
  - `(source, postedAt DESC)`

2. Revisit text-search strategy.
- Current `ILIKE` across multiple fields can be expensive.
- Consider trigram/full-text indexes if search frequency is high.

3. Count optimization.
- Consider approximate counts for heavy filter sets if exact is not mandatory.

---

## 6) Concrete File-Level Worklist for Next Model

## API (must-do)
- `apps/api/src/repositories/JobRepository.ts`
  - Rewrite `upsertMany` to chunked bulk upsert.
  - Dedupe by `url` before DB write.

- `apps/api/src/routes/sourceRoutes.ts`
  - Restrict `/scrape` endpoint.

- `apps/api/src/services/jobService.ts`
  - Deterministic cache keys.
  - Longer TTLs.
  - Optional split cache for counts.

- `apps/api/src/lib/redis.ts`
  - Replace `keys(pattern)` strategy with scalable invalidation (versioning/sets).

- `apps/api/src/controllers/JobController.ts`
  - Remove per-request user DB lookup for plan (token claim or cached lookup).

- `apps/api/src/services/authService.ts` + `apps/api/src/middleware/authMiddleware.ts`
  - Add/consume subscription plan claim if using JWT strategy.

- `apps/api/src/controllers/SubscriptionController.ts` / `services/stripeService.ts`
  - Cache/invalidate current subscription response.

## Web (must-do)
- `apps/web/src/hooks/use-jobs.ts`
  - Add auth-gated `enabled` for saved jobs query.

- `apps/web/src/providers/query-provider.tsx`
  - Increase default stale/gc windows.

- `apps/web/src/hooks/use-subscription.ts`
  - Increase staleTime on `useCurrentSubscription`.

- `apps/web/src/app/jobs/page.tsx`
  - Increase default `limit` to reduce pagination calls.

- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/register/page.tsx`
- `apps/web/src/app/bookmarks/page.tsx`
  - Replace direct fetch with shared API + query/mutation hooks.

## Shared consistency
- `packages/shared/src/constants/index.ts`
- `apps/api/src/services/stripeService.ts`
  - Resolve free-tier result limit mismatch (40 vs 100).

---

## 7) Suggested Rollout Sequence (Safest)

1. Protect `/api/sources/scrape` + add telemetry.
2. Bulk upsert rewrite.
3. Cache-key normalization + scalable invalidation.
4. Token plan caching (remove per-list user DB lookup).
5. Web query tuning and large default limits.
6. Optional index and advanced search tuning.

Reasoning:
- Steps 1–3 provide the largest immediate budget protection.
- Later steps improve steady-state and UX without risking ingest path.

---

## 8) Verification Checklist

After each phase, verify with logs/metrics:

1. DB writes per scrape run
- Before vs after: number of SQL statements during one cron scrape cycle.
- Target: dramatic reduction (e.g., from N jobs => N writes down to N/chunk writes).

2. API cache hit rate
- `%` hit for `/api/jobs` and `/api/jobs/:id`.
- Target: high hit rate for repeated browsing patterns.

3. Jobs browsing request count
- Compare opening `/jobs`, changing filters, paginating through 200 results.
- Target: fewer API calls due bigger page size and caching.

4. Subscription/read call frequency
- `GET /api/subscriptions/current` frequency per active user session.
- Target: very low (cached long enough).

5. Budget dashboard
- Daily DB request total and top consumers.
- Must alert before projected monthly breach.

---

## 9) Notes and Assumptions

- Existing git tree is already dirty with unrelated modifications; this plan avoids assumptions about those changes.
- No schema migrations currently managed (`synchronize: true` in TypeORM). Any index/schema changes should be handled carefully for production stability.
- Redis-backed cache strategy is central to meeting the 100k request constraint.
- “Large requests” interpreted as larger page sizes/chunked writes to reduce round-trips.

---

## 10) Quick Wins (If Only 1 Day Available)

If implementation time is extremely limited, do these first:

1. Restrict `/api/sources/scrape` endpoint.
2. Convert `upsertMany` to chunked bulk upsert.
3. Increase `/api/jobs` cache TTL + normalize key.
4. Remove per-list `userRepo.findById` by using token plan claim.
5. Set web jobs default limit higher and gate saved-jobs query by auth.

These five changes should yield the largest immediate reduction in request burn.


---

## 11) Endpoint-to-DB Call Map (Current State)

This is a practical map of where DB calls happen today.

## `/api/jobs` (GET)
Path:
- `jobRoutes` -> `JobController.listJobs` -> `JobService.listJobs` -> `JobRepository.findMany`

Current DB behavior:
- Anonymous user:
  - `findMany` => typically 2 queries (`SELECT page`, `COUNT(*)`) via `getManyAndCount`.
- Authenticated user:
  - `userRepo.findById` (plan lookup) + `findMany` (2 queries) = usually 3 queries.
- Cache behavior:
  - Redis cache hit avoids repository query, but authenticated plan lookup currently happens before cache return in controller path.

## `/api/jobs/:id` (GET)
Path:
- `JobService.getJob` -> `JobRepository.findById`

Current DB behavior:
- 1 query on miss, 0 on cache hit.

## `/api/jobs/search` (GET)
Path:
- `JobService.searchJobs` -> `JobRepository.search`

Current DB behavior:
- 1 query on miss, 0 on cache hit.

## `/api/jobs/saved/list` (GET, auth)
Path:
- `JobService.getSavedJobs` -> `UserRepository.getSavedJobs`

Current DB behavior:
- 1 relation query (join/load relations), depends on ORM relation loading shape.

## `/api/jobs/saved/:jobId` (POST)
Path:
- `JobService.saveJob`

Current DB behavior:
- `findById(job)` (1)
- `isJobSaved` (1)
- `saveJob` insert (1)
- Total ~3 queries.

## `/api/jobs/saved/:jobId` (DELETE)
Path:
- `JobService.unsaveJob`

Current DB behavior:
- 1 delete query.

## `/api/auth/me` (GET)
Path:
- `AuthService.getProfile` -> `UserRepository.findById`

Current DB behavior:
- 1 query.

## `/api/subscriptions/current` (GET, auth)
Path:
- `SubscriptionController.getCurrentSubscription`

Current DB behavior:
- 1 `findByIdFull` query.
- Called from header hook in web, so tune caching aggressively.

## Scraper ingest (`cron` and `/api/sources/scrape`)
Path:
- `processJobs` -> `JobRepository.upsertMany`

Current DB behavior:
- ~1 query per job row (largest known pressure point).

---

## 12) Request Budget Scenarios (Back-of-Envelope)

These numbers are directional to prioritize work, not exact billing replicas.

Scenario A: 10,000 scraped jobs/day, current row-by-row upsert
- Upsert write queries/day: ~10,000
- Monthly: ~300,000 queries (already 3x the 100k budget, before reads)

Scenario B: same volume, chunked upsert of 1,000 rows/query
- Upsert write queries/day: ~10
- Monthly: ~300
- Savings: ~99.9% for that path

Scenario C: user browsing load (authenticated) before optimization
- 1 list page request ~= 3 DB queries
- 100 list requests/day ~= 300 queries/day

Scenario D: user browsing load after plan claim + cache hit improvements
- 1 list request on warm cache ~= 0 DB queries
- Cold request ~= 2 DB queries (if count/page uncached)

Conclusion:
- **Bulk upsert is the make-or-break item** for staying under budget.

---

## 13) Implementation Notes (Detailed)

## A) Bulk Upsert with Chunking (recommended first coding task)

Implementation details:
- Keep `url` as natural uniqueness key (already unique in `Job` entity).
- Pre-clean values to avoid undefined fields causing SQL bloating.
- Chunk size tuning:
  - Start with 1000.
  - If query payload too big, reduce to 500.

Error handling:
- Fail fast per chunk with context (`chunk index`, `size`, source key if available).
- Do not swallow all errors with `Promise.allSettled` for writes; this hides corruption.

## B) Cache Versioning Pattern (replace `delPattern`)

Suggested keys:
- `jobs:list:version` => integer
- `jobs:list:v{N}:{hash}` => list payload
- `jobs:count:v{N}:{hash}` => count payload

Invalidation:
- After successful scrape write batch, `INCR jobs:list:version`.
- Old keys naturally expire by TTL; no global key scans.

## C) Deterministic Filter Hash

Normalize filters by:
- Applying defaults (`page`, `limit`, `sortBy`, `sortOrder`).
- Removing empty values.
- Sorting keys.
- Stable stringification.

This prevents cache misses caused by equivalent-but-differently-ordered query objects.

## D) User Plan Without Per-Request DB Read

JWT approach:
- Add `subscriptionPlan` claim in token at login/register.
- `authMiddleware` sets `req.user.subscriptionPlan`.
- `JobController.listJobs` reads plan from token directly.

Tradeoff:
- Plan change latency until token refresh.
- Mitigation options:
  - shorter JWT expiry,
  - token refresh endpoint,
  - version field in token checked against cache.

---

## 14) Web Optimization Details

1. `useSavedJobs` should not call API when logged out.
- Add `enabled: !!apiClient.getToken()`.

2. `useCurrentSubscription` should be sticky.
- Suggested config:
  - `staleTime: 15 * 60 * 1000`
  - `gcTime: 60 * 60 * 1000`

3. Jobs page default `limit` increase.
- Existing: 20.
- Suggested initial: 40 (balanced) or 100 (aggressive).
- Decision depends on final free-tier cap policy.

4. Remove hardcoded host fetches.
- Use `apiClient` everywhere to avoid env drift and duplicate handling.

---

## 15) Commands for Next Model (Verification Workflow)

Use these after implementation:

```bash
# 1) Typecheck / lint
pnpm -r exec tsc --noEmit
pnpm --filter @jobagg/web lint

# 2) Run API and observe logs for cache + query metrics
pnpm --filter @jobagg/api dev

# 3) Run web
pnpm --filter @jobagg/web dev

# 4) Simulate browse flow and compare query logs before/after
# - Open /jobs
# - Change filters
# - paginate several pages
# - open job details

# 5) Trigger controlled scrape and compare DB query counts
# (ensure protected endpoint/auth rules are satisfied)
```

If TypeORM query logging is too noisy, add summarized counters and print every 60 seconds.

---

## 16) Open Decisions (Need Product/Owner Confirmation)

1. Final FREE tier visible results cap: 40 or 100?
- Code currently disagrees between shared constants and Stripe plan payload.

2. JWT plan claim strategy vs Redis plan cache strategy?
- JWT is simpler request path; Redis is fresher for immediate plan changes.

3. Preferred freshness target for job listings?
- 1 minute, 5 minutes, or 15 minutes affects cache TTL and hit rates.

4. Should manual scrape endpoint exist in production at all?
- If yes, must be strongly protected and audited.

---

## 17) Final Priority Summary

If the next model can only do 3 things immediately:

1. Bulk chunked upsert in `JobRepository.upsertMany`.
2. Protect/disable public manual scrape trigger.
3. Deterministic long-lived list caching with scalable invalidation.

Those 3 items alone should produce the largest budget protection effect.
