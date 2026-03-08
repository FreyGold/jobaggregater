// ─── Validate Request Middleware ──────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import type { AnyZodObject } from 'zod';

export function validateRequest(schema: AnyZodObject, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[target]);
    // Replace the target with the parsed (and coerced) value
    (req as any)[target] = parsed;
    next();
  };
}
