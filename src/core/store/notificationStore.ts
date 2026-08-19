import { create } from 'zustand';
import type { NotificationLog, NotificationEventType, NotificationChannel } from '@/types';

interface NotificationStore {
  logs: NotificationLog[];
  addLog: (entry: Omit<NotificationLog, 'id' | 'createdAt'>) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  logs: [],

  addLog: (entry) =>
    set((state) => ({
      logs: [
        {
          ...entry,
          id: `nl${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        },
        ...state.logs,
      ],
    })),
}));

// ─── Helper: fire notifications for a billing event ───────────────────────────
export function fireNotification(params: {
  eventType: NotificationEventType;
  customerId?: string;
  customerName: string;
  accountNumber: string;
  phone?: string;
  email?: string;
  message: string;
  subject?: string;
}) {
  const { addLog } = useNotificationStore.getState();
  const now = new Date().toISOString();

  const channels: { channel: NotificationChannel; recipient: string }[] = [];

  if (params.phone) {
    channels.push({ channel: 'sms', recipient: params.phone });
  }
  if (params.email) {
    channels.push({ channel: 'email', recipient: params.email });
  }
  if (!params.phone && !params.email) {
    channels.push({ channel: 'sms', recipient: '+254 7XX XXX XXX' });
  }

  channels.forEach(({ channel, recipient }) => {
    addLog({
      tenantId: 't1',
      customerId: params.customerId,
      customerName: params.customerName,
      accountNumber: params.accountNumber,
      eventType: params.eventType,
      channel,
      subject: params.subject,
      message: params.message,
      recipient,
      status: 'delivered',
      sentAt: now,
    });
  });
}
