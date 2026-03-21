// ─── React Query Hooks: Jobs ─────────────────────────────────────

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { buildQueryString, type Job, type JobFilters, type PaginationMeta } from '@jobagg/shared';

// ─── List Jobs ───────────────────────────────────────────────────
export function useJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: ['jobs', filters],
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-jobs'] }),
  });

  const unsave = useMutation({
    mutationFn: (jobId: string) => apiClient.delete(`/api/jobs/saved/${jobId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-jobs'] }),
  });

  return { save, unsave };
}
