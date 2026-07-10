import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AlertHistoryDay, ApiResponse, SavedJob, SavedJobStatus, Job } from './types';

// ── Configuration ────────────────────────────────────────────────────────────
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (Platform.OS === 'web' ? 'http://localhost:3001' : 'http://10.0.2.2:3001');

const TOKEN_KEY = 'auth_token';
let authToken: string | null = null;

// ── Token helpers ────────────────────────────────────────────────────────────
export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  authToken = token;
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  authToken = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function hasToken(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

// ── Generic request wrapper ──────────────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authToken || (await getToken());
  if (token && !authToken) {
    authToken = token;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    await clearToken();
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  return json as T;
}

// ── Axios-like api wrapper for auth.tsx ─────────────────────────────────────
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

// ── Custom Alert / Jobs Screen Helpers ──────────────────────────────────────
// These wrap 'request' and catch errors to match ApiResponse format expected by UI screens
async function safeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const data = await request<ApiResponse<T>>(endpoint, options);
    return data;
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'Unauthorized') {
      return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
    }
    return {
      data: null,
      error: { message: msg || 'Network error' },
    };
  }
}

export async function fetchAlertHistory(): Promise<ApiResponse<AlertHistoryDay[]>> {
  return safeRequest<AlertHistoryDay[]>('/api/alerts/history');
}

export async function fetchSavedJobs(): Promise<ApiResponse<SavedJob[]>> {
  return safeRequest<SavedJob[]>('/api/jobs/saved/list');
}

export async function saveJob(
  jobId: string,
  status: SavedJobStatus = 'WISHLIST'
): Promise<ApiResponse<{ message: string }>> {
  return safeRequest<{ message: string }>(`/api/jobs/saved/${jobId}`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function unsaveJob(jobId: string): Promise<ApiResponse<{ message: string }>> {
  return safeRequest<{ message: string }>(`/api/jobs/saved/${jobId}`, {
    method: 'DELETE',
  });
}

export async function updateJobStatus(
  jobId: string,
  status: SavedJobStatus
): Promise<ApiResponse<{ message: string }>> {
  return safeRequest<{ message: string }>(`/api/jobs/saved/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function fetchAlertSubscriptions(): Promise<ApiResponse<any[]>> {
  return safeRequest<any[]>('/api/alerts');
}

export async function createAlertSubscription(
  email: string,
  keywords: string[],
  frequency: 'daily' | 'weekly' = 'daily'
): Promise<ApiResponse<any>> {
  return safeRequest<any>('/api/alerts', {
    method: 'POST',
    body: JSON.stringify({ email, keywords, frequency }),
  });
}

export async function deleteAlertSubscription(id: string): Promise<ApiResponse<any>> {
  return safeRequest<any>(`/api/alerts/${id}`, {
    method: 'DELETE',
  });
}

export async function testAlertSubscription(id: string): Promise<ApiResponse<any>> {
  return safeRequest<any>(`/api/alerts/${id}/test`, {
    method: 'POST',
  });
}
