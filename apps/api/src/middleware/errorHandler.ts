// ─── Error Handler Middleware ─────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logError, logWarn } from '../lib/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!details[path]) details[path] = [];
      details[path]!.push(e.message);
    });

    logWarn('Validation error', { details });

    res.status(400).json({
      data: null,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details,
      },
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logError('Application error', err, { code: err.code, statusCode: err.statusCode });
    } else {
      logWarn('Application error', { code: err.code, statusCode: err.statusCode, message: err.message });
    }

    res.status(err.statusCode).json({
      data: null,
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  // Unknown errors
  logError('Unhandled error', err);
  res.status(500).json({
    data: null,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
