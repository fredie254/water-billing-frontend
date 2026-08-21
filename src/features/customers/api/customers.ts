import { apiClient, unwrapList } from '@/core/api/client';
import type { Customer, QueryParams } from '@/types';

const BASE = '/customers';

function normalizeCustomer(raw: Record<string, unknown>): Customer {
  return {
    id:                 raw.id as string,
    tenantId:           (raw.tenantId ?? '') as string,
    // API returns customer_number → camelCase: customerNumber; type uses customerNo
    customerNo:         (raw.customerNumber ?? raw.customerNo ?? '') as string,
    name:               (raw.name ?? '') as string,
    companyName:        raw.companyName as string | undefined,
    email:              raw.email as string | undefined,
    phone:              raw.phone as string | undefined,
    idNumber:           raw.idNumber as string | undefined,
    idType:             raw.idType as Customer['idType'],
    address:            raw.address as string | undefined,
    customerType:       raw.customerType as Customer['customerType'],
    status:             (raw.status ?? 'active') as Customer['status'],
    totalConnections:   raw.totalConnections != null ? Number(raw.totalConnections) : undefined,
    outstandingBalance: raw.outstandingBalance != null ? Number(raw.outstandingBalance) : undefined,
    createdAt:          (raw.createdAt ?? '') as string,
  };
}

export const customersApi = {
  list: (params?: QueryParams) =>
    apiClient.get(BASE, { params }).then((r) => {
      const raw = unwrapList<Record<string, unknown>>(r.data);
      return { ...raw, data: raw.data.map(normalizeCustomer) };
    }),

  getOne: (id: string) =>
    apiClient.get(`${BASE}/${id}`).then((r) => {
      const body = r.data as Record<string, unknown>;
      const raw = (body?.data ?? body) as Record<string, unknown>;
      return normalizeCustomer(raw);
    }),

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
