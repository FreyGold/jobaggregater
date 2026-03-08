// ─── Base Controller ─────────────────────────────────────────────
// All controllers extend this. Provides standard response helpers.

import type { Response } from 'express';
import type { PaginationMeta } from '@jobagg/shared';

export abstract class BaseController {
  protected handleSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
    res.status(statusCode).json({ data, error: null });
  }

  protected handlePaginatedSuccess<T>(
    res: Response,
    data: T,
    meta: PaginationMeta,
  ): void {
    res.status(200).json({ data, error: null, meta });
  }

  protected handleError(error: unknown, res: Response, context: string): void {
    console.error(`[${context}]`, error);
    throw error; // Let errorHandler middleware handle it
  }
}
