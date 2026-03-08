// ─── Async Error Wrapper ─────────────────────────────────────────
// Wraps async route handlers so rejected promises are caught by Express.

import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncErrorWrapper(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
