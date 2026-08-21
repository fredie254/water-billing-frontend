import { apiClient, unwrapList } from '@/core/api/client';
import type { Bill, Connection, Tariff, QueryParams } from '@/types';

export const billsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/invoices', { params }).then((r) => unwrapList<Bill>(r.data)),

  getOne: (id: string) =>
    apiClient.get<{ data: Bill }>(`/invoices/${id}`).then((r) => r.data.data),

  generate: (data: {
    connectionId: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    currentReading?: number;
    dueDate: string;
    discountPercent?: number;
    penaltyAmount?: number;
    notes?: string;
  }) =>
    apiClient.post<{ data: Bill }>('/invoices/generate', data).then((r) => r.data.data),

  bulkGenerate: (data: {
    billingPeriodStart: string;
    billingPeriodEnd: string;
    dueDate: string;
    zoneId?: string;
  }) =>
    apiClient.post('/invoices/bulk-generate', data).then((r) => r.data),

  voidBill: (id: string, reason: string) =>
    apiClient.post(`/invoices/${id}/void`, { reason }),

  send: (id: string) => apiClient.post(`/invoices/${id}/send`),

  downloadPdf: (id: string) =>
    apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};

export const connectionsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/connections', { params }).then((r) => unwrapList<Connection>(r.data)),

  getOne: (id: string) =>
    apiClient.get<{ data: Connection }>(`/connections/${id}`).then((r) => r.data.data),

  create: (data: Partial<Connection>) =>
    apiClient.post<{ data: Connection }>('/connections', data).then((r) => r.data.data),

  update: (id: string, data: { tariffId?: string; routeId?: string; zoneId?: string; deposit?: number; status?: string }) =>
    apiClient.put<{ data: Connection }>(`/connections/${id}`, data).then((r) => r.data.data),

  suspend: (id: string, reason: string) =>
    apiClient.post(`/connections/${id}/suspend`, { reason }),

  activate: (id: string) => apiClient.post(`/connections/${id}/activate`),

  disconnect: (id: string) => apiClient.post(`/connections/${id}/disconnect`),
};

export const tariffsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/tariffs', { params }).then((r) => unwrapList<Tariff>(r.data)),

  getOne: (id: string) =>
    apiClient.get<{ data: Tariff }>(`/tariffs/${id}`).then((r) => r.data.data),

  create: (data: Partial<Tariff> & { blocks: Array<{ fromUnits: number; toUnits: number | null; ratePerUnit: number }> }) =>
    apiClient.post<{ data: Tariff }>('/tariffs', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Tariff>) =>
    apiClient.put<{ data: Tariff }>(`/tariffs/${id}`, data).then((r) => r.data.data),

  deactivate: (id: string) => apiClient.post(`/tariffs/${id}/deactivate`),
};
