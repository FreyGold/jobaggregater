// ─── React Query Hooks: Jobs ─────────────────────────────────────

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { buildQueryString, type Job, type JobFilters, type PaginationMeta } from '@jobagg/shared';

// ─── List Jobs ───────────────────────────────────────────────────
export function useJobs(filters: JobFilters = {}) {
  // Detect if this is a "today's jobs" query by checking if dateFrom is recent
  const isTodaysJobs = useMemo(
    () => filters.dateFrom ? isDateFromToday(filters.dateFrom) : false,
    [filters.dateFrom]
  );
  
  // Create a stable query key based on actual filter values (memoized to prevent recreating on every render)
  const queryKey = useMemo(
    () => [
      'jobs',
      filters.keyword,
      filters.location,
      filters.source,
      filters.employmentType,
      filters.experienceLevel,
      filters.isRemote,
      filters.arabOnly,
      filters.dateFrom,
      filters.page,
      filters.limit,
    ] as const,
    [
      filters.keyword,
      filters.location,
      filters.source,
      filters.employmentType,
      filters.experienceLevel,
      filters.isRemote,
      filters.arabOnly,
      filters.dateFrom,
      filters.page,
      filters.limit,
    ]
  );

  // Memoize query options to prevent refetch on option changes
  const queryOptions = useMemo(
    () => ({
      staleTime: isTodaysJobs ? 2 * 60 * 1000 : 30 * 1000,
      gcTime: isTodaysJobs ? 2 * 60 * 1000 : 5 * 60 * 1000,
    }),
    [isTodaysJobs]
  );
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const qs = buildQueryString(filters as Record<string, unknown>);
      const res = await apiClient.get<Job[]>(`/api/jobs${qs}`);
      return { jobs: res.data, meta: res.meta as PaginationMeta };
    },
    ...queryOptions,
  });
}

// Helper to check if dateFrom is from "today" (within last 24 hours)
function isDateFromToday(dateFromISO: string): boolean {
  try {
    const dateFrom = new Date(dateFromISO);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return dateFrom >= twentyFourHoursAgo;
  } catch {
    return false;
  }
}

// ─── Single Job ──────────────────────────────────────────────────
export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await apiClient.get<Job>(`/api/jobs/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

// ─── Search Jobs ─────────────────────────────────────────────────
export function useSearchJobs(query: string) {
  return useQuery({
    queryKey: ['jobs', 'search', query],
    queryFn: async () => {
      const res = await apiClient.get<Job[]>(`/api/jobs/search?q=${encodeURIComponent(query)}`);
      return res.data;
    },
    enabled: query.length >= 2,
  });
}

// ─── Saved Jobs ──────────────────────────────────────────────────
export function useSavedJobs() {
  return useQuery({
    queryKey: ['saved-jobs'],
    queryFn: async () => {
      const res = await apiClient.get<Job[]>('/api/jobs/saved/list');
      return res.data;
    },
    enabled: !!apiClient.getToken(),
  });
}

// ─── Save / Unsave Mutations ─────────────────────────────────────
export function useSaveJob() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (jobId: string) => apiClient.post(`/api/jobs/saved/${jobId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-jobs'] }),
  });

  const unsave = useMutation({
    mutationFn: (jobId: string) => apiClient.delete(`/api/jobs/saved/${jobId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-jobs'] }),
  });

  return { save, unsave };
}
