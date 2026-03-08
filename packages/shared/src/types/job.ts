// ─── Job Types ───────────────────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  url: string;
  sourceId: string;
  sourceName: string;
  description: string;
  shortDescription?: string;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  tags: string[];
  postedAt: string;
  scrapedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export interface JobCreateInput {
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  url: string;
  sourceId: string;
  sourceName: string;
  description: string;
  shortDescription?: string;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  tags: string[];
  postedAt: string;
}
