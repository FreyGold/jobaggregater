export type SavedJobStatus = 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  url: string;
  source: string;
  description: string;
  postedAt: string;
  tags?: string[];
  employmentType?: string;
  experienceLevel?: string;
  isRemote?: boolean;
}

export interface SavedJob extends Job {
  savedStatus: SavedJobStatus;
  savedAt: string;
}

export interface KeywordGroup {
  keyword: string;
  jobs: Job[];
}

export interface AlertHistoryDay {
  date: string;
  keywords: KeywordGroup[];
}

export interface ApiResponse<T> {
  data: T | null;
  error?: {
    message: string;
    code?: string;
  } | null;
}
