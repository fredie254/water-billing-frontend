import { apiClient, unwrapList } from '@/core/api/client';
import type { NotificationLog, NotificationTemplate, NotificationEventType, NotificationChannel, NotificationDeliveryStatus, QueryParams } from '@/types';

function normalizeLog(raw: Record<string, unknown>): NotificationLog {
  return {
    id:            (raw.id ?? '') as string,
    tenantId:      (raw.tenantId ?? '') as string,
    customerId:    raw.customerId as string | undefined,
    customerName:  (raw.customerName ?? raw.customer ?? raw.name) as string | undefined,
    accountNumber: (raw.accountNumber ?? raw.account ?? raw.accountNo) as string | undefined,
    // API may return type / event / notification_type instead of event_type
    eventType:     (raw.eventType ?? raw.type ?? raw.event ?? raw.notificationType ?? '') as NotificationEventType,
    // API may return channel_type / delivery_channel instead of channel
    channel:       (raw.channel ?? raw.channelType ?? raw.deliveryChannel ?? 'sms') as NotificationChannel,
    subject:       raw.subject as string | undefined,
    message:       (raw.message ?? raw.body ?? raw.content ?? '') as string,
    recipient:     (raw.recipient ?? raw.to ?? raw.phone ?? raw.email ?? '') as string,
    // API may return delivery_status instead of status
    status:        (raw.status ?? raw.deliveryStatus ?? raw.state ?? 'sent') as NotificationDeliveryStatus,
    errorMessage:  (raw.errorMessage ?? raw.error ?? raw.failureReason) as string | undefined,
    sentAt:        (raw.sentAt ?? raw.dispatchedAt ?? raw.processedAt) as string | undefined,
    createdAt:     (raw.createdAt ?? '') as string,
  };
}

export const notificationsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/notifications', { params }).then((r) => {
      const raw = unwrapList<Record<string, unknown>>(r.data);
      return { ...raw, data: raw.data.map(normalizeLog) };
    }),

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
