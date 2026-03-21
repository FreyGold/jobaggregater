// ─── Auth Middleware ─────────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/unifiedConfig.js';
import { AppError } from './errorHandler.js';
import type { SubscriptionPlan } from '@jobagg/shared';

export interface AuthPayload {
  userId: string;
  email: string;
  subscriptionPlan?: SubscriptionPlan;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      subscriptionPlan?: string;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'UNAUTHORIZED');
  }
}

/**
 * Optional auth — same as authMiddleware but does NOT throw on missing/invalid token.
 * Sets req.user = undefined for unauthenticated requests.
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = undefined;
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as AuthPayload;
    req.user = payload;
  } catch {
    req.user = undefined;
  }
  next();
}
