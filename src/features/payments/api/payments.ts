import { apiClient } from '@/core/api/client';
import type { Payment, PaginatedResponse, QueryParams } from '@/types';

export const paymentsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Payment>>('/payments', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Payment }>(`/payments/${id}`).then((r) => r.data.data),

  record: (data: Partial<Payment>) =>
    apiClient.post<{ data: Payment }>('/payments', data).then((r) => r.data.data),

  reverse: (id: string, reason: string) =>
    apiClient.post(`/payments/${id}/reverse`, { reason }),

  mpesaStkPush: (data: { accountNumber: string; amount: number; phoneNumber: string }) =>
    apiClient.post('/payments/mpesa/stk-push', data).then((r) => r.data),

  mpesaQuery: (checkoutRequestId: string) =>
    apiClient.get(`/payments/mpesa/query/${checkoutRequestId}`).then((r) => r.data),

  downloadReceipt: (id: string) =>
    apiClient.get(`/payments/${id}/receipt`, { responseType: 'blob' }).then((r) => r.data),
};
