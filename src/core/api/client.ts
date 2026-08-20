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
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Blob) && !(obj instanceof FormData)) {
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

// Outgoing: attach token + convert request body/params to snake_case
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.data && !(config.data instanceof FormData)) {
    config.data = convertKeys(config.data, toSnakeCase);
  }
  if (config.params) {
    config.params = convertKeys(config.params, toSnakeCase);
  }

  return config;
});

// Incoming: convert response keys to camelCase; handle 401
apiClient.interceptors.response.use(
  (res) => {
    if (res.data && !(res.data instanceof Blob)) {
      res.data = convertKeys(res.data, toCamelCase);
    }
    return res;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const extractError = (error: unknown): string => {
  const e = error as AxiosError<{ message?: string; detail?: string }>;
  return (
    e.response?.data?.message ||
    e.response?.data?.detail ||
    e.message ||
    'An unexpected error occurred'
  );
};
