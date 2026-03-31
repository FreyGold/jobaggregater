// ─── Zod Validators: Auth ─────────────────────────────────────────────

import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(255, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(255, 'Name too long'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format'),
  password: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
