// ─── Mobile API Client ───────────────────────────────────────────

import type { ApiResponse, ApiErrorResponse } from '@jobagg/shared';

// TODO: Replace with your actual API URL or use env vars
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as ApiErrorResponse;
    throw new Error(error.error?.message ?? 'An error occurred');
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<ApiResponse<T>>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) =>
    request<ApiResponse<T>>(endpoint, { method: 'DELETE' }),
};
