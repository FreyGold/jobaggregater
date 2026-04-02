# Description Scraper Validation Checklist

## Quick Validation (5 minutes)

### 1. Check Scrapers Have Description Methods
```bash
cd apps/api
grep -l "scrapeJobDescription" src/scrapers/*.ts
```

**Expected Output:**
```
src/scrapers/LinkedInScraper.ts
src/scrapers/RemotiveScraper.ts
src/scrapers/WeWorkRemotelyScraper.ts
src/scrapers/BuiltInScraper.ts
src/scrapers/TanqeebScraper.ts
src/scrapers/GulfTalentScraper.ts
src/scrapers/GreenhouseScraper.ts
src/scrapers/LeverScraper.ts
src/scrapers/AshbyScraper.ts
src/scrapers/WorkableScraper.ts
src/scrapers/HackerNewsScraper.ts
src/scrapers/RemoteOKScraper.ts
```

All 12+ scrapers should have the method. ✅

---

### 2. Check API Endpoint Exists
```bash
# Make sure the enrichment endpoint is registered
grep -n "enrich-description" src/routes/jobRoutes.ts
```

**Expected:**
```
/:id/enrich-description
```

Endpoint registered. ✅

---

### 3. Check Description Validation Service
```bash
# Verify service is created and exported
grep -n "JobDescriptionService" src/services/jobDescriptionService.ts | head -1
```

**Expected:**
```
export class JobDescriptionService
```

Service exists. ✅

---

## Integration Testing (15 minutes)

### Test 1: API Returns Price IDs
```bash
curl http://localhost:3001/api/subscriptions/plans
```

Should show:
```json
{
  "data": [
    { "id": "FREE", "stripePriceId": undefined },
    { "id": "PRO", "stripePriceId": "price_..." },
    { "id": "ENTERPRISE", "stripePriceId": "price_..." }
  ]
}
```

✅ Stripe configured correctly

---

### Test 2: Enrich a Job Without Description

First, get a job ID from the database that has an empty or short description:
```bash
psql postgresql://user:password@localhost:5432/jobaggDB
SELECT id, title, description FROM job WHERE description IS NULL OR description = '' LIMIT 1;
```

Copy the job ID, then:
```bash
curl -X POST http://localhost:3001/api/jobs/JOB_ID/enrich-description
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "job-123",
    "title": "Full Stack Developer",
    "description": "We are looking for a Full Stack Developer...",
    "source": "LinkedIn"
  }
}
```

Description is now populated. ✅

**Error Response (if no scraper or can't fetch):**
```json
{
  "success": false,
  "error": "Failed to fetch job description from source",
  "code": "SCRAPE_FAILED"
}
```

This is expected if the job board is blocking requests. ✅

---

### Test 3: Check Database Persistence

After enrichment, verify the description was saved:
```bash
psql postgresql://user:password@localhost:5432/jobaggDB
SELECT id, description FROM job WHERE id = 'job-123';
```

Description should be updated in the database. ✅

---

## Frontend Testing

### Test 1: Pricing Page Shows
Visit: http://localhost:3000/pricing

**Expected:**
- Pricing cards visible for FREE, PRO, ENTERPRISE
- Upgrade buttons visible for PRO and ENTERPRISE

If it says "Payments Unavailable":
- Check that `STRIPE_PRICE_PRO_ID` and `STRIPE_PRICE_ENTERPRISE_ID` are set in `.env`
- Restart API server

✅ Pricing shows

---

### Test 2: Click Upgrade (With Valid Price IDs)
1. Click "Upgrade to PRO" button
2. Should redirect to Stripe checkout
3. Can use test card: `4242 4242 4242 4242`

✅ Checkout works

---

### Test 3: Click Upgrade (With Invalid Price IDs)
If you're using placeholder price IDs like `"19"` instead of `"price_xxx"`:

1. Click "Upgrade to PRO" button
2. Should get error: `"Invalid price ID for PRO: "19". Price IDs must start with "price_"."`
3. Error includes link to Stripe Dashboard

✅ Validation catches errors

---

## Database Check

### Count Jobs with Descriptions
```bash
psql postgresql://user:password@localhost:5432/jobaggDB

SELECT 
  source_name,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) as with_desc,
  COUNT(CASE WHEN description IS NULL OR description = '' THEN 1 END) as without_desc
FROM job
GROUP BY source_name
ORDER BY total_jobs DESC;
```

**Expected Pattern:**
```
| source_name    | total | with_desc | without_desc |
|----------------+-------+-----------|--------------|
| LinkedIn       | 150   | 145       | 5            |
| Remotive       | 45    | 45        | 0            |
| BuiltIn        | 30    | 28        | 2            |
| Tanqeeb        | 200   | 180       | 20           |
| GulfTalent     | 60    | 55        | 5            |
```

- Most jobs have descriptions ✅
- Some may need enrichment (the without_desc count) ✅

---

## Scraper Coverage Validation

### Verify All Active Scrapers Have scrapeJobDescription

```bash
cd apps/api
for scraper in src/scrapers/*.ts; do
  if grep -q "scrapeJobDescription" "$scraper"; then
    echo "✅ $(basename $scraper)"
  else
    echo "❌ $(basename $scraper)"
  fi
done
```

**All should show ✅**

---

## Enrichment API Validation

### Test Enrichment for Different Sources

```bash
# LinkedIn job
curl -X POST http://localhost:3001/api/jobs/linkedin-job-123/enrich-description

# Tanqeeb job
curl -X POST http://localhost:3001/api/jobs/tq-456/enrich-description

# GulfTalent job
curl -X POST http://localhost:3001/api/jobs/gt-789/enrich-description
```

Each should either:
- ✅ Return enriched job with description
- ⚠️ Return error (if page unreachable)
- ✅ Both are fine - validating that API works

---

## Performance Check

### Enrichment Response Time
```bash
time curl -X POST http://localhost:3001/api/jobs/job-123/enrich-description
```

**Expected:**
- First call: 1-3 seconds (includes page fetch + parsing)
- Second call: <100ms (cached in DB)

✅ Performance is good

---

## Summary Checklist

- [ ] All scrapers have `scrapeJobDescription` method
- [ ] Enrichment endpoint exists and is registered
- [ ] Service created and exported
- [ ] API returns correct Stripe price IDs
- [ ] Can enrich a job with missing description
- [ ] Database stores enriched description
- [ ] Pricing page shows (not "Payments unavailable")
- [ ] Upgrade buttons work (or give clear error if price IDs wrong)
- [ ] Most jobs in DB have descriptions
- [ ] Enrichment API returns results in <3 seconds

**If all checked:** ✅ Descriptions are working!

---

## Troubleshooting

### Enrichment fails with "No scraper available"
→ Source name not recognized. Check jobDescriptionService sourceKeyMap

### Enrichment returns error "Could not extract description"
→ Job board page structure changed or blocking requests
→ Use proxy URL in `.env` if blocked

### Database descriptions are empty despite enrichment
→ Check if enrichment was actually called
→ Look for logs: "Job description enriched successfully"

### Pricing shows "Payments unavailable"
→ Stripe not configured or invalid price IDs
→ Update `.env` with real price IDs from Stripe Dashboard
