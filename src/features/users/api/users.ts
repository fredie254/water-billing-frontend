import { apiClient, unwrapList } from '@/core/api/client';
import type { User, UserRole, QueryParams } from '@/types';

// Mirrors the ROLE_MAP in Login.tsx — keeps role display consistent on the Users page
const ROLE_MAP: Record<string, UserRole> = {
  admin:               'super_admin',
  system_admin:        'super_admin',
  super_admin:         'super_admin',
  tenant_admin:        'tenant_admin',
  manager:             'manager',
  billing:             'billing_officer',
  billing_officer:     'billing_officer',
  finance:             'finance_manager',
  finance_manager:     'finance_manager',
  customer_service:    'customer_service',
  support:             'customer_service',
  metering:            'metering_supervisor',
  metering_supervisor: 'metering_supervisor',
  reader:              'meter_reader',
  meter_reader:        'meter_reader',
  field_officer:       'meter_reader',
  accountant:          'accountant',
  auditor:             'auditor',
  customer:            'customer',
};

function normalizeUser(u: User): User {
  const mapped = ROLE_MAP[u.role as string];
  return mapped ? { ...u, role: mapped } : u;
}

export const usersApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/users', { params }).then((r) => {
      const result = unwrapList<User>(r.data);
      return { ...result, data: (result.data ?? []).map(normalizeUser) };
    }),

  getOne: (id: string) =>
    apiClient.get<{ data: User }>(`/users/${id}`).then((r) => normalizeUser(r.data.data)),

  create: (data: { name: string; email: string; phone?: string; role: string; password: string; zoneIds?: string[] }) =>
    apiClient.post<{ data: User }>('/users', data).then((r) => r.data.data),

  update: (id: string, data: Partial<User>) =>
    apiClient.put<{ data: User }>(`/users/${id}`, data).then((r) => r.data.data),

  delete: (id: string) =>
    apiClient.delete(`/users/${id}`),

  deactivate: (id: string, reason?: string) =>
    apiClient.post(`/users/${id}/deactivate`, reason ? { reason } : undefined),

  activate: (id: string) => apiClient.post(`/users/${id}/activate`),

  updateRole: (id: string, role: string, reason?: string) =>
    apiClient.put(`/users/${id}/role`, { role, reason }),

  resetPassword: (id: string, newPassword?: string) =>
    apiClient.post(`/users/${id}/reset-password`, newPassword ? { newPassword } : undefined),

  getLoginHistory: (id: string, params?: QueryParams) =>
    apiClient.get(`/users/${id}/login-history`, { params }).then((r) => r.data),
};
