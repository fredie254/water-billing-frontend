import { apiClient, unwrapList } from '@/core/api/client';
import type { Customer, QueryParams } from '@/types';

const BASE = '/customers';

export const customersApi = {
  list: (params?: QueryParams) =>
    apiClient.get(BASE, { params }).then((r) => unwrapList<Customer>(r.data)),

  getOne: (id: string) =>
    apiClient.get<{ data: Customer }>(`${BASE}/${id}`).then((r) => r.data.data),

  create: (data: Partial<Customer>) =>
    apiClient.post<{ data: Customer }>(BASE, data).then((r) => r.data.data),

  update: (id: string, data: Partial<Customer>) =>
    apiClient.put<{ data: Customer }>(`${BASE}/${id}`, data).then((r) => r.data.data),

  suspend: (id: string, reason?: string) =>
    apiClient.post(`${BASE}/${id}/suspend`, { reason }),

  activate: (id: string) => apiClient.post(`${BASE}/${id}/activate`),

  delete: (id: string) => apiClient.delete(`${BASE}/${id}`),

  getBills: (id: string, params?: QueryParams) =>
    apiClient.get(`${BASE}/${id}/bills`, { params }).then((r) => r.data),

  getPayments: (id: string, params?: QueryParams) =>
    apiClient.get(`${BASE}/${id}/payments`, { params }).then((r) => r.data),
};
