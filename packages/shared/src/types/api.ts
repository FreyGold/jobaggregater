// ─── API Response Types ──────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error: null;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  data: null;
  error: {
    message: string;
    code: string;
    details?: Record<string, string[]>;
  };
  meta?: undefined;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  plan?: string;
  cappedAt?: number;
  upgradeMessage?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JobFilters extends PaginationParams {
  keyword?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  source?: string;
  isRemote?: boolean;
  arabOnly?: boolean;
  employmentType?: string;
  experienceLevel?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  tab?: 'all' | 'today';
}
