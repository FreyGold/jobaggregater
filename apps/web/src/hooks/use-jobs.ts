// ─── React Query Hooks: Jobs ─────────────────────────────────────

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { buildQueryString, type Job, type JobFilters, type PaginationMeta } from '@jobagg/shared';

// ─── List Jobs ───────────────────────────────────────────────────
export function useJobs(filters: JobFilters = {}) {
  // Create a stable query key based on actual filter values
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
      filters.tab,
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
      filters.tab,
      filters.dateFrom,
      filters.page,
      filters.limit,
    ]
  );
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const qs = buildQueryString(filters as Record<string, unknown>);
      const res = await apiClient.get<Job[]>(`/api/jobs${qs}`);
      return { jobs: res.data, meta: res.meta as PaginationMeta };
    },
  });
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
    onMutate: async (jobId: string) => {
      await queryClient.cancelQueries({ queryKey: ['saved-jobs'] });
      const previousSavedJobs = queryClient.getQueryData<Job[]>(['saved-jobs']);
      queryClient.setQueryData<any[]>(['saved-jobs'], (old) => {
        const newJob = { id: jobId, jobId, status: 'WISHLIST' };
        return old ? [...old, newJob] : [newJob];
      });
      return { previousSavedJobs };
    },
    onError: (err, newJobId, context) => {
      queryClient.setQueryData(['saved-jobs'], context?.previousSavedJobs);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
    },
  });

  const unsave = useMutation({
    mutationFn: (jobId: string) => apiClient.delete(`/api/jobs/saved/${jobId}`),
    onMutate: async (jobId: string) => {
      await queryClient.cancelQueries({ queryKey: ['saved-jobs'] });
      const previousSavedJobs = queryClient.getQueryData<Job[]>(['saved-jobs']);
      queryClient.setQueryData<any[]>(['saved-jobs'], (old) => {
        return old ? old.filter((job) => job.id !== jobId && job.jobId !== jobId) : [];
      });
      return { previousSavedJobs };
    },
    onError: (err, jobId, context) => {
      queryClient.setQueryData(['saved-jobs'], context?.previousSavedJobs);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: string }) => 
      apiClient.patch(`/api/jobs/saved/${jobId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-jobs'] }),
  });

  return { save, unsave, updateStatus };
}

export function useAtsScore() {
  return useMutation({
    mutationFn: async ({ jobId, resumeId }: { jobId: string; resumeId: string }) => {
      const res = await apiClient.post<{ score: number; missingKeywords: string[]; analysis: string }>(
        `/api/jobs/${jobId}/score`,
        { resumeId }
      );
      return res.data;
    },
  });
}
