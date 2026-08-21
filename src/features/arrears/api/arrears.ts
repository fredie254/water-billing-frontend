import { apiClient, unwrapList } from '@/core/api/client';
import type { PaymentPlan, QueryParams } from '@/types';

export const arrearsApi = {
  // Returns { accounts: [...], summary: {...} } — not a paginated list
  list: (params?: QueryParams) =>
    apiClient.get('/arrears', { params }).then((r) => {
      const body = r.data as Record<string, unknown>;
      return (body?.success !== undefined ? body.data : body) as Record<string, unknown>;
    }),
};

export const paymentPlansApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/payment-plans', { params }).then((r) => unwrapList<PaymentPlan>(r.data)),

  getOne: (id: string) =>
    apiClient.get<{ data: PaymentPlan }>(`/payment-plans/${id}`).then((r) => r.data.data),

  create: (data: {
    customerId: string;
    connectionId: string;
    billIds: string[];
    totalAmount: number;
    installments: number;
    startDate: string;
    notes?: string;
  }) =>
    apiClient.post<{ data: PaymentPlan }>('/payment-plans', data).then((r) => r.data.data),

  update: (id: string, data: Partial<PaymentPlan>) =>
    apiClient.put<{ data: PaymentPlan }>(`/payment-plans/${id}`, data).then((r) => r.data.data),

  cancel: (id: string, reason: string) =>
    apiClient.post(`/payment-plans/${id}/cancel`, { reason }),
};
