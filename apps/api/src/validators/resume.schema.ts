import { z } from 'zod';

export const tailorResumeSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required').max(255),
  companyName: z.string().min(1, 'Company name is required').max(255),
  jobDescription: z.string().min(1, 'Job description is required'),
  jobUrl: z.string().url().optional().or(z.literal('')),
});

export type TailorResumeInput = z.infer<typeof tailorResumeSchema>;
