// ─── Rate Limit Middleware ────────────────────────────────────────

import * as expressRateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { SUBSCRIPTION_LIMITS } from '@jobagg/shared';

const createRateLimit = expressRateLimit.rateLimit;
const { ipKeyGenerator } = expressRateLimit;

function keyFor(req: Request) {
  const userId = req.user?.userId;
  // Use helper to normalize IPv6 (prevents bypass) and works behind proxies.
  const ipKey = ipKeyGenerator(req.ip ?? '');
  return userId ? `u:${userId}` : `ip:${ipKey}`;
}

// Pre-built limiters for each tier
const limiters = {
  FREE: createRateLimit({
    windowMs: 60 * 1000,
    max: SUBSCRIPTION_LIMITS.FREE.rateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor,
    message: {
      data: null,
      error: {
        message: 'Too many requests. Upgrade your plan for higher limits.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    },
  }),
  PRO: createRateLimit({
    windowMs: 60 * 1000,
    max: SUBSCRIPTION_LIMITS.PRO.rateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor,
    message: {
      data: null,
      error: {
        message: 'Rate limit exceeded.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    },
  }),
  ENTERPRISE: createRateLimit({
    windowMs: 60 * 1000,
    max: SUBSCRIPTION_LIMITS.ENTERPRISE.rateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor,
    message: {
      data: null,
      error: {
        message: 'Rate limit exceeded.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    },
  }),
};

/**
 * Global rate limiter — applies FREE tier limits to all requests.
 * For per-user tier-based limiting, use `tieredRateLimit` after auth.
 */
export const globalRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: SUBSCRIPTION_LIMITS.FREE.rateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Per-tier rate limiter — checks `req.user?.subscriptionPlan` set by auth middleware.
 * Defaults to FREE limits for unauthenticated users.
 */
export function tieredRateLimit(req: Request, res: Response, next: NextFunction): void {
  const plan = (req as any).subscriptionPlan || 'FREE';
  const limiter = limiters[plan as keyof typeof limiters] || limiters.FREE;
  limiter(req, res, next);
}
