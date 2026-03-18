// ─── React Query Hooks: Auth ─────────────────────────────────────

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { AuthResponse, User, UserCreateInput, LoginInput } from '@jobagg/shared';

// ─── Current User ────────────────────────────────────────────────
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<User>('/api/auth/me');
      return res.data;
    },
    retry: false,
    enabled: !!apiClient.getToken(),
  });
}

// ─── Login ───────────────────────────────────────────────────────
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await apiClient.post<AuthResponse>('/api/auth/login', input);
      return res.data;
    },
    onSuccess: (data) => {
      apiClient.setToken(data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

// ─── Register ────────────────────────────────────────────────────
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UserCreateInput) => {
      const res = await apiClient.post<AuthResponse>('/api/auth/register', input);
      return res.data;
    },
    onSuccess: (data) => {
      apiClient.setToken(data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

// ─── Logout ──────────────────────────────────────────────────────
export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    apiClient.setToken(null);
    queryClient.clear();
  };
}
