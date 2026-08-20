import { apiClient } from '@/core/api/client';
import type { BillingPeriod, PaginatedResponse, QueryParams } from '@/types';

export const billingPeriodsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<BillingPeriod>>('/billing-periods', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: BillingPeriod }>(`/billing-periods/${id}`).then((r) => r.data.data),

  create: (data: {
    name: string;
    cycleType: string;
    readingPeriodStart: string;
    readingPeriodEnd: string;
    billingDate: string;
    dueDate: string;
    notes?: string;
  }) =>
    apiClient.post<{ data: BillingPeriod }>('/billing-periods', data).then((r) => r.data.data),

  update: (id: string, data: Partial<BillingPeriod>) =>
    apiClient.put<{ data: BillingPeriod }>(`/billing-periods/${id}`, data).then((r) => r.data.data),

  generateBills: (id: string, data: {
    billingPeriodStart: string;
    billingPeriodEnd: string;
    dueDate: string;
    zoneId?: string;
  }) =>
    apiClient.post(`/billing-periods/${id}/generate-bills`, data).then((r) => r.data),
};
