// ─── Zod Validators: Jobs ────────────────────────────────────────

import { z } from 'zod';

export const jobFiltersSchema = z.object({
  keyword: z.string().optional(),
  location: z.string().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  source: z.string().optional(),
  isRemote: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  arabOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  employmentType: z.string().optional(),
  experienceLevel: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tags: z
    .string()
    .transform((v) => v.split(','))
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['postedAt', 'salaryMin', 'title', 'company']).default('postedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type JobFiltersInput = z.infer<typeof jobFiltersSchema>;
