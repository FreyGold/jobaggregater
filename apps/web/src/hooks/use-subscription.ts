// ─── React Query Hooks: Subscriptions ────────────────────────────

'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: 'FREE' | 'PRO' | 'ENTERPRISE';
  name: string;
  price: number;
  currency: string;
  interval: 'month';
  features: string[];
  limits: {
    jobResultsPerPage: number | null;
    savedJobs: number | null;
    rateLimit: number;
  };
  stripePriceId?: string;
}

export interface CurrentSubscription {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'NONE';
  stripeCustomerId: string | null;
}

// ─── Fetch Plans (public) ────────────────────────────────────────
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: async () => {
      const res = await apiClient.get<SubscriptionPlan[]>('/api/subscriptions/plans');
      return res.data;
    },
    staleTime: 1000 * 60 * 30, // 30 min
  });
}

// ─── Current Subscription (auth) ─────────────────────────────────
export function useCurrentSubscription() {
  return useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: async () => {
      const res = await apiClient.get<CurrentSubscription>('/api/subscriptions/current');
      return res.data;
    },
    retry: false,
    enabled: !!apiClient.getToken(),
  });
}

// ─── Create Checkout Session ─────────────────────────────────────
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (plan: 'PRO' | 'ENTERPRISE') => {
      const res = await apiClient.post<{ url: string; sessionId: string }>(
        '/api/subscriptions/checkout',
        { plan },
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

// ─── Create Customer Portal Session ──────────────────────────────
export function useCreatePortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ url: string }>('/api/subscriptions/portal');
      return res.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}
