import axios from 'axios';
import type { AxiosError } from 'axios';
import { useAuthStore } from '@/core/auth/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const extractError = (error: unknown): string => {
  const e = error as AxiosError<{ message?: string }>;
  return e.response?.data?.message || e.message || 'An unexpected error occurred';
};
