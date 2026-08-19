import { apiClient } from '@/core/api/client';
import type { Bill, Connection, Tariff, PaginatedResponse, QueryParams } from '@/types';

export const billsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Bill>>('/invoices', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Bill }>(`/invoices/${id}`).then((r) => r.data.data),

  generate: (connectionId: string, period: { month: number; year: number }) =>
    apiClient.post<{ data: Bill }>('/invoices/generate', { connectionId, ...period }).then((r) => r.data.data),

  bulkGenerate: (period: { month: number; year: number }) =>
    apiClient.post('/invoices/bulk-generate', period).then((r) => r.data),

  voidBill: (id: string, reason: string) =>
    apiClient.post(`/invoices/${id}/void`, { reason }),

  send: (id: string) => apiClient.post(`/invoices/${id}/send`),

  downloadPdf: (id: string) =>
    apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};

export const connectionsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Connection>>('/connections', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Connection }>(`/connections/${id}`).then((r) => r.data.data),

  create: (data: Partial<Connection>) =>
    apiClient.post<{ data: Connection }>('/connections', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Connection>) =>
    apiClient.put<{ data: Connection }>(`/connections/${id}`, data).then((r) => r.data.data),

  suspend: (id: string, reason?: string) =>
    apiClient.post(`/connections/${id}/suspend`, { reason }),

  activate: (id: string) => apiClient.post(`/connections/${id}/activate`),

  disconnect: (id: string) => apiClient.post(`/connections/${id}/disconnect`),
};

export const tariffsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Tariff>>('/tariffs', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Tariff }>(`/tariffs/${id}`).then((r) => r.data.data),

  create: (data: Partial<Tariff>) =>
    apiClient.post<{ data: Tariff }>('/tariffs', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Tariff>) =>
    apiClient.put<{ data: Tariff }>(`/tariffs/${id}`, data).then((r) => r.data.data),

  deactivate: (id: string) => apiClient.post(`/tariffs/${id}/deactivate`),
};
