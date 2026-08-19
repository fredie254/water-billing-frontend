import { apiClient } from '@/core/api/client';
import type { PaymentPlan, PaginatedResponse, QueryParams } from '@/types';

export const arrearsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/arrears', { params }).then((r) => r.data),
};

export const paymentPlansApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<PaymentPlan>>('/payment-plans', { params }).then((r) => r.data),

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
