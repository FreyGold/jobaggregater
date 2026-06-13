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

export function useTailoredResume(id: string | undefined) {
  return useQuery({
    queryKey: ['tailored-resume', id],
    queryFn: async () => {
      const res = await apiClient.get<TailoredResume>(`/api/resumes/tailored/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUpdateTailored() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tailoredContent }: { id: string; tailoredContent: string }) => {
      const res = await apiClient.put<TailoredResume>(`/api/resumes/tailored/${id}`, { tailoredContent });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tailored-resumes'] });
      queryClient.invalidateQueries({ queryKey: ['tailored-resume', data.id] });
    },
  });
}

export function useGenerateCv() {
  return useMutation({
    mutationFn: async (latex: string): Promise<Blob> => {
      return apiClient.postBlob('/api/generate-cv', { latex });
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
