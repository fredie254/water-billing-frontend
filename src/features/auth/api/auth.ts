import { apiClient } from '@/core/api/client';
import type { AuthResponse, User } from '@/types';

/**
 * FastAPI backends vary in their login response shape:
 *   { access_token, token_type }                   — bare OAuth2 response
 *   { data: { access_token, refresh_token, user } } — wrapped response
 *   { token, user }                                 — custom flat response
 * After our camelCase interceptor runs the keys become accessToken / token / etc.
 * This function tries every variant so we never silently miss the token.
 */
function parseLoginResponse(raw: unknown): AuthResponse {
  const root = raw as Record<string, unknown>;

  // Unwrap { success, data: { ... } } envelope if present
  const p = (root?.data ?? root) as Record<string, unknown>;

  const accessToken = (
    p.accessToken   ??   // access_token  → camelCase
    p.token         ??   // bare "token"
    p.jwt           ??   // bare "jwt"
    p.jwtToken      ??   // jwt_token     → camelCase
    p.authToken          // auth_token    → camelCase
  ) as string | undefined;

  const refreshToken = (
    p.refreshToken  ??   // refresh_token → camelCase
    p.refresh       ??
    ''
  ) as string;

  const user = (p.user ?? p.userData ?? p.currentUser) as User | undefined;

  // Temporary diagnostic — remove after token shape is confirmed
  console.debug('[RUMAWASCO AUTH] Login response keys:', Object.keys(p));
  console.debug('[RUMAWASCO AUTH] Token found:', !!accessToken, '| prefix:', accessToken?.slice(0, 30));
  console.debug('[RUMAWASCO AUTH] User role:', user?.role);

  return {
    accessToken: accessToken ?? '',
    refreshToken,
    user: (user ?? {}) as User,
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password })
      .then((r) => parseLoginResponse(r.data)),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),

  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }).then((r) => {
      const root = r.data as Record<string, unknown>;
      const p = (root?.data ?? root) as Record<string, unknown>;
      return { accessToken: (p.accessToken ?? p.token ?? '') as string };
    }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),

  getMe: () =>
    apiClient.get('/auth/me').then((r) => {
      const p = (r.data as Record<string, unknown>)?.data ?? r.data;
      return p as User;
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put('/auth/change-password', { currentPassword, newPassword }),
};
