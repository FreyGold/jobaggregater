'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Resume, TailoredResume, TailorResumeInput } from '@jobagg/shared';

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const res = await apiClient.get<Resume[]>('/api/resumes');
      return res.data;
    },
  });
}

export function useTailoredResumes() {
  return useQuery({
    queryKey: ['tailored-resumes'],
    queryFn: async () => {
      const res = await apiClient.get<TailoredResume[]>('/api/resumes/tailored');
      return res.data;
    },
  });
}

export function useDeleteTailored() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/resumes/tailored/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailored-resumes'] });
    },
  });
}
