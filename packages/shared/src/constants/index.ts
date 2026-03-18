// ─── Constants ───────────────────────────────────────────────────

export const EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
] as const;

export const EXPERIENCE_LEVELS = [
  'entry',
  'mid',
  'senior',
  'lead',
  'executive',
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Subscription Tier Limits ────────────────────────────────────

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    jobResultsPerPage: 40,
    savedJobs: 10,
    rateLimit: 60, // requests per minute
  },
  PRO: {
    jobResultsPerPage: null, // unlimited
    savedJobs: null,
    rateLimit: 300,
  },
  ENTERPRISE: {
    jobResultsPerPage: null,
    savedJobs: null,
    rateLimit: 1000,
  },
} as const;

// ─── API Routes ──────────────────────────────────────────────────

export const API_ROUTES = {
  JOBS: '/api/jobs',
  JOB_BY_ID: (id: string) => `/api/jobs/${id}`,
  JOBS_SEARCH: '/api/jobs/search',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_ME: '/api/auth/me',
  SAVED_JOBS: '/api/saved-jobs',
  SAVED_JOB_BY_ID: (jobId: string) => `/api/saved-jobs/${jobId}`,
  SOURCES: '/api/sources',
  SCRAPERS_RUN: '/api/scrapers/run',
  SUBSCRIPTIONS_PLANS: '/api/subscriptions/plans',
  SUBSCRIPTIONS_CHECKOUT: '/api/subscriptions/checkout',
  SUBSCRIPTIONS_PORTAL: '/api/subscriptions/portal',
  SUBSCRIPTIONS_CURRENT: '/api/subscriptions/current',
} as const;
