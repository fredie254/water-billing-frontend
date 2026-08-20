import { apiClient } from '@/core/api/client';
import type { NotificationLog, NotificationTemplate, PaginatedResponse, QueryParams } from '@/types';

export const notificationsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<NotificationLog>>('/notifications', { params }).then((r) => r.data),

  send: (data: { customerId: string; type: string; subject?: string; message: string }) =>
    apiClient.post('/notifications/send', data).then((r) => r.data),

  getTemplates: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<NotificationTemplate>>('/notifications/templates', { params }).then((r) => r.data),

  createTemplate: (data: { name: string; type: string; event: string; subject?: string; body: string; isActive: boolean }) =>
    apiClient.post<{ data: NotificationTemplate }>('/notifications/templates', data).then((r) => r.data.data),

  updateTemplate: (id: string, data: { name?: string; type?: string; event?: string; subject?: string; body?: string; isActive?: boolean }) =>
    apiClient.put<{ data: NotificationTemplate }>(`/notifications/templates/${id}`, data).then((r) => r.data.data),

  getChannels: () =>
    apiClient.get('/notifications/channels').then((r) => r.data),

  updateChannel: (channel: string, data: Record<string, unknown>) =>
    apiClient.put(`/notifications/channels/${channel}`, data).then((r) => r.data),
};
