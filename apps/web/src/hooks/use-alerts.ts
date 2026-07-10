'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface EmailSubscription {
  id: string;
  email: string;
  keywords: string[];
  frequency: 'daily' | 'weekly';
  isActive: boolean;
  createdAt: string;
  lastSentAt: string | null;
}

export function useAlertSubscriptions() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await apiClient.get<EmailSubscription[]>('/api/alerts');
      return res.data;
    },
    enabled: !!apiClient.getToken(),
  });
}

export function useSubscribeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; keywords: string[]; frequency: 'daily' | 'weekly' }) => {
      const res = await apiClient.post<EmailSubscription>('/api/alerts', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useUnsubscribeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: boolean }>(`/api/alerts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useTestAlert() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ success: boolean }>(`/api/alerts/${id}/test`);
      return res.data;
    },
  });
}

export interface AlertHistoryEntry {
  date: string;
  keywords: {
    keyword: string;
    jobs: any[];
  }[];
}

export function useAlertHistory() {
  return useQuery({
    queryKey: ['alerts', 'history'],
    queryFn: async () => {
      const res = await apiClient.get<AlertHistoryEntry[]>('/api/alerts/history');
      return res.data;
    },
    enabled: !!apiClient.getToken(),
  });
}
