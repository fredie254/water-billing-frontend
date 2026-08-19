import { apiClient } from '@/core/api/client';
import type { QueryParams } from '@/types';

export const portalApi = {
  getOverview: () =>
    apiClient.get('/portal/overview').then((r) => r.data.data),

  getBills: (params?: QueryParams) =>
    apiClient.get('/portal/bills', { params }).then((r) => r.data),

  getBill: (id: string) =>
    apiClient.get(`/portal/bills/${id}`).then((r) => r.data.data),

  downloadBillPdf: (id: string) =>
    apiClient.get(`/portal/bills/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),

  getPayments: (params?: QueryParams) =>
    apiClient.get('/portal/payments', { params }).then((r) => r.data),

  getReceipts: (params?: QueryParams) =>
    apiClient.get('/portal/receipts', { params }).then((r) => r.data),

  downloadReceiptPdf: (id: string) =>
    apiClient.get(`/portal/receipts/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),

  getConsumption: () =>
    apiClient.get('/portal/consumption').then((r) => r.data.data),

  getNotifications: (params?: QueryParams) =>
    apiClient.get('/portal/notifications', { params }).then((r) => r.data),
};
