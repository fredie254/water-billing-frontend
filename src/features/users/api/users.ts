import { apiClient } from '@/core/api/client';
import type { User, PaginatedResponse, QueryParams } from '@/types';

export const usersApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: User }>(`/users/${id}`).then((r) => r.data.data),

  create: (data: Partial<User> & { password: string }) =>
    apiClient.post<{ data: User }>('/users', data).then((r) => r.data.data),

  update: (id: string, data: Partial<User>) =>
    apiClient.put<{ data: User }>(`/users/${id}`, data).then((r) => r.data.data),

  deactivate: (id: string, reason?: string) =>
    apiClient.post(`/users/${id}/deactivate`, { reason }),

  activate: (id: string) => apiClient.post(`/users/${id}/activate`),

  updateRole: (id: string, role: string, reason?: string) =>
    apiClient.put(`/users/${id}/role`, { role, reason }),

  resetPassword: (id: string) => apiClient.post(`/users/${id}/reset-password`),

  getLoginHistory: (id: string, params?: QueryParams) =>
    apiClient.get(`/users/${id}/login-history`, { params }).then((r) => r.data),
};
