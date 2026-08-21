import { apiClient } from '@/core/api/client';
import type { AuthResponse, User } from '@/types';

// Unwrap { success, data: <payload> } OR flat <payload> — whichever the API returns
function unwrap<T>(responseData: unknown): T {
  const d = responseData as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }).then((r) => unwrap<AuthResponse>(r.data)),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),

  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }).then((r) => unwrap<{ accessToken: string }>(r.data)),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),

  getMe: () =>
    apiClient.get('/auth/me').then((r) => unwrap<User>(r.data)),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put('/auth/change-password', { currentPassword, newPassword }),
};
