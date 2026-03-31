// ─── Request Validation Middleware ────────────────────────────────────────
// Validates request body, query, or params against Zod schemas

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

export type ValidationSource = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, source: ValidationSource = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

      const validated = schema.parse(dataToValidate);

      // Attach validated data back to request
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        req.query = validated;
      } else {
        req.params = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        const message = firstError ? `Validation failed: ${firstError.message}` : 'Validation failed';

        throw new AppError(400, message, 'VALIDATION_ERROR');
      }

      next(error);
    }
  };
};
