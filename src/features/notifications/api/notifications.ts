import { apiClient, unwrapList } from '@/core/api/client';
import type { NotificationLog, NotificationTemplate, QueryParams } from '@/types';

export const notificationsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/notifications', { params }).then((r) => unwrapList<NotificationLog>(r.data)),

  send: (data: { customerId: string; type: string; subject?: string; message: string }) =>
    apiClient.post('/notifications/send', data).then((r) => r.data),

  getTemplates: (params?: QueryParams) =>
    apiClient.get('/notifications/templates', { params }).then((r) => unwrapList<NotificationTemplate>(r.data)),

  createTemplate: (data: { name: string; type: string; event: string; subject?: string; body: string; isActive: boolean }) =>
    apiClient.post('/notifications/templates', data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as NotificationTemplate;
    }),

  updateTemplate: (id: string, data: { name?: string; type?: string; event?: string; subject?: string; body?: string; isActive?: boolean }) =>
    apiClient.put(`/notifications/templates/${id}`, data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as NotificationTemplate;
    }),

  getChannels: () =>
    apiClient.get('/notifications/channels').then((r) => r.data),

  updateChannel: (channel: string, data: Record<string, unknown>) =>
    apiClient.put(`/notifications/channels/${channel}`, data).then((r) => r.data),
};
