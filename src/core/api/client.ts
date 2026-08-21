import axios from 'axios';
import type { AxiosError } from 'axios';
import { useAuthStore } from '@/core/auth/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ── Case converters ───────────────────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function convertKeys(obj: unknown, convert: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map((v) => convertKeys(v, convert));
  if (
    obj !== null &&
    typeof obj === 'object' &&
    !(obj instanceof Blob) &&
    !(obj instanceof FormData)
  ) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        convert(k),
        convertKeys(v, convert),
      ]),
    );
  }
  return obj;
}

// ── Axios instance ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Attach Bearer token + convert body/params to snake_case

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    // Use bracket notation — avoids any AxiosHeaders property-descriptor quirks
    config.headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.debug('[RUMAWASCO] No token for request:', config.url);
  }

  if (config.data && !(config.data instanceof FormData)) {
    config.data = convertKeys(config.data, toSnakeCase);
  }
  if (config.params) {
    config.params = convertKeys(config.params, toSnakeCase);
  }

  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
// Convert response keys to camelCase; redirect to login on 401 only

apiClient.interceptors.response.use(
  (res) => {
    if (res.data && !(res.data instanceof Blob)) {
      res.data = convertKeys(res.data, toCamelCase);
    }
    return res;
  },
  (error: AxiosError) => {
    // Only auto-logout on 401 Unauthorized — genuine auth failure
    // 403 Forbidden may be a permissions issue on a specific resource (not a lost session)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── List response unwrapper ───────────────────────────────────────────────────
// The API may return any of these shapes (after camelCase conversion):
//   { success, data: [ ...items ] }
//   { success, data: { data:[...], pagination:{total,page,pageSize} } }
//   { success, data: { items:[...], total, page, pageSize } }
//   { data:[...], pagination:{...} }  (PaginatedResponse directly)

export interface UnwrappedList<T> {
  data: T[];
  pagination: { total: number; page: number; pageSize: number };
}

export function unwrapList<T>(raw: unknown): UnwrappedList<T> {
  const body = raw as Record<string, unknown>;

  // Strip the outer { success, data, message } envelope when present
  const payload = (body?.success !== undefined ? body.data : body) as Record<string, unknown>;

  // Find the items array
  const items = (
    Array.isArray(payload)            ? payload           :
    Array.isArray(payload?.data)      ? payload.data      :
    Array.isArray(payload?.items)     ? payload.items     :
    Array.isArray(payload?.results)   ? payload.results   :
    []
  ) as T[];

  // Find pagination wherever it lives.
  // Some APIs put it at root (body.pagination) alongside data; others nest it inside payload.
  const pg = (
    payload?.pagination ??
    payload?.meta       ??
    body?.pagination    ??
    (Array.isArray(payload) ? {} : payload)
  ) as Record<string, unknown>;

  return {
    data: items,
    pagination: {
      total:    Number(pg?.total    ?? pg?.totalItems ?? pg?.count ?? items.length),
      page:     Number(pg?.page     ?? pg?.currentPage ?? 1),
      pageSize: Number(pg?.pageSize ?? pg?.perPage ?? pg?.limit ?? (items.length || 10)),
    },
  };
}

// ── Error helper ──────────────────────────────────────────────────────────────

export const extractError = (error: unknown): string => {
  const e = error as AxiosError<{ message?: string; detail?: string }>;
  return (
    e.response?.data?.message ||
    e.response?.data?.detail ||
    e.message ||
    'An unexpected error occurred'
  );
};
