import { apiClient } from '@/core/api/client';
import type { DisconnectionOrder, PaginatedResponse, QueryParams } from '@/types';

export const disconnectionsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<DisconnectionOrder>>('/disconnections', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: DisconnectionOrder }>(`/disconnections/${id}`).then((r) => r.data.data),

  create: (data: { connectionId: string; reason: string; daysOverdue: number; balance: number }) =>
    apiClient.post<{ data: DisconnectionOrder }>('/disconnections', data).then((r) => r.data.data),

  sendReminder: (id: string, notes?: string) =>
    apiClient.post(`/disconnections/${id}/send-reminder`, { notes }),

  issueNotice: (id: string, notes?: string) =>
    apiClient.post(`/disconnections/${id}/issue-notice`, { notes }),

  submitApproval: (id: string, notes?: string) =>
    apiClient.post(`/disconnections/${id}/submit-approval`, { notes }),

  approve: (id: string, notes?: string) =>
    apiClient.post(`/disconnections/${id}/approve`, { notes }),

  execute: (data: { id: string; disconnectedAt: string; performedBy: string; notes?: string }) =>
    apiClient.post(`/disconnections/${data.id}/execute`, data),

  requestReconnection: (id: string, data: { amountPaid: number; paymentReference: string; notes?: string }) =>
    apiClient.post(`/disconnections/${id}/request-reconnection`, data),

  approveReconnection: (id: string, notes?: string) =>
    apiClient.post(`/disconnections/${id}/approve-reconnection`, { notes }),

  markReconnected: (id: string, data: { reconnectedAt: string; performedBy: string; notes?: string }) =>
    apiClient.post(`/disconnections/${id}/mark-reconnected`, data),

  cancel: (id: string, reason: string) =>
    apiClient.post(`/disconnections/${id}/cancel`, { reason }),
};
