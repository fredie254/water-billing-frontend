import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bell, Mail, MessageSquare, Smartphone, CheckCircle, XCircle,
  Plus, Zap, Settings, Eye, EyeOff, Send, AlertTriangle,
} from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input, Select } from '@/shared/components/ui/Input';
import { notificationsApi } from '@/features/notifications/api/notifications';
import { formatDateTime, cn } from '@/shared/utils/utils';
import type {
  NotificationLog, NotificationTemplate,
  NotificationEventType, NotificationChannel, NotificationDeliveryStatus,
} from '@/types';

// ─── Config ──────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<NotificationEventType, { label: string; color: string }> = {
  new_bill:             { label: 'New Bill',             color: 'bg-blue-100 text-blue-800' },
  payment_received:     { label: 'Payment Received',     color: 'bg-green-100 text-green-800' },
  payment_failed:       { label: 'Payment Failed',       color: 'bg-red-100 text-red-800' },
  bill_overdue:         { label: 'Bill Overdue',         color: 'bg-orange-100 text-orange-800' },
  service_disconnected: { label: 'Disconnected',         color: 'bg-red-100 text-red-800' },
  service_restored:     { label: 'Service Restored',     color: 'bg-green-100 text-green-800' },
  reading_reminder:     { label: 'Reading Reminder',     color: 'bg-purple-100 text-purple-800' },
  high_consumption:     { label: 'High Consumption',     color: 'bg-yellow-100 text-yellow-800' },
  leak_detected:        { label: 'Leak Detected',        color: 'bg-cyan-100 text-cyan-800' },
  meter_tampering:      { label: 'Meter Tampering',      color: 'bg-red-100 text-red-800' },
  account_suspension:   { label: 'Account Suspended',   color: 'bg-gray-100 text-gray-800' },
  payment_plan_created: { label: 'Payment Plan',        color: 'bg-indigo-100 text-indigo-800' },
  disconnection_notice: { label: 'Disconnection Notice', color: 'bg-orange-100 text-orange-800' },
};

const CHANNEL_CONFIG: Record<NotificationChannel, { label: string; icon: React.ReactNode; color: string }> = {
  sms:      { label: 'SMS',       icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'bg-green-50 text-green-700' },
  email:    { label: 'Email',     icon: <Mail className="w-3.5 h-3.5" />,          color: 'bg-blue-50 text-blue-700' },
  push:     { label: 'Push',      icon: <Bell className="w-3.5 h-3.5" />,          color: 'bg-purple-50 text-purple-700' },
  whatsapp: { label: 'WhatsApp',  icon: <Smartphone className="w-3.5 h-3.5" />,    color: 'bg-emerald-50 text-emerald-700' },
};

const STATUS_VARIANT: Record<NotificationDeliveryStatus, string> = {
  pending:   'yellow',
  sent:      'blue',
  delivered: 'green',
  failed:    'red',
};

// ─── Schema ──────────────────────────────────────────────────────────────────

const sendSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  eventType: z.string().min(1, 'Event type is required'),
  channel: z.string().min(1, 'Channel is required'),
  customMessage: z.string().optional(),
});
type SendValues = z.infer<typeof sendSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

type PageTab = 'log' | 'templates' | 'settings';

export const Notifications = () => {
  const [pageTab, setPageTab] = useState<PageTab>('log');

  // ── Log state ──
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logTotal, setLogTotal] = useState(0);

  // ── Templates state ──
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | NotificationChannel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | NotificationDeliveryStatus>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<SendValues>({
    resolver: zodResolver(sendSchema),
    defaultValues: { channel: 'sms', eventType: 'new_bill' },
  });

  const watchedEvent = watch('eventType') as NotificationEventType;
  const watchedChannel = watch('channel') as NotificationChannel;
  const previewTemplate = templates.find(
    (t) => t.eventType === watchedEvent && t.channel === watchedChannel && t.isActive,
  );

  // ── Fetch logs ──
  const fetchLogs = useCallback(() => {
    setLogsLoading(true);
    const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
    if (search)                          params.search = search;
    if (channelFilter !== 'all')         params.channel = channelFilter;
    if (statusFilter !== 'all')          params.status = statusFilter;
    notificationsApi.list(params)
      .then(r => { setLogs(r.data ?? []); setLogTotal(r.total ?? 0); })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [page, search, channelFilter, statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Fetch templates ──
  const fetchTemplates = useCallback(() => {
    setTemplatesLoading(true);
    notificationsApi.getTemplates({ limit: 200 })
      .then(r => setTemplates(r.data ?? []))
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Stats (derived from log page — best effort) ──
  const totalSent = logTotal;
  const delivered = logs.filter((l) => l.status === 'delivered').length;
  const failed    = logs.filter((l) => l.status === 'failed').length;
  const smsSent   = logs.filter((l) => l.channel === 'sms').length;
  const emailSent = logs.filter((l) => l.channel === 'email').length;

  const onSend = async (values: SendValues) => {
    setSendingStatus('sending');
    try {
      await notificationsApi.send({
        customerId: values.accountNumber,
        type: values.eventType,
        message: values.customMessage || previewTemplate?.body || '(custom message)',
        subject: previewTemplate?.subject,
      });
      setSendingStatus('sent');
      fetchLogs();
      await new Promise((r) => setTimeout(r, 1000));
    } catch {
      setSendingStatus('idle');
    } finally {
      setShowSendModal(false);
      setSendingStatus('idle');
      reset();
    }
  };

  const toggleTemplate = async (id: string) => {
    const tmpl = templates.find(t => t.id === id);
    if (!tmpl) return;
    const updated = await notificationsApi.updateTemplate(id, { isActive: !tmpl.isActive }).catch(() => null);
    if (updated) {
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
    }
  };

  // ── Columns ──
  const columns: Column<NotificationLog>[] = [
    {
      key: 'eventType', header: 'Event',
      render: (r) => {
        const cfg = EVENT_CONFIG[r.eventType];
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'customerName', header: 'Customer',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{r.customerName ?? '—'}</p>
          <p className="text-xs font-mono text-gray-400">{r.accountNumber ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'channel', header: 'Channel',
      render: (r) => {
        const cfg = CHANNEL_CONFIG[r.channel];
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium', cfg.color)}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'recipient', header: 'Recipient',
      render: (r) => <span className="text-xs text-gray-500 font-mono">{r.recipient}</span>,
    },
    {
      key: 'message', header: 'Message Preview',
      render: (r) => (
        <p className="text-xs text-gray-600 max-w-xs truncate" title={r.message}>{r.message}</p>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <div>
          <Badge label={r.status} variant={STATUS_VARIANT[r.status] as any} />
          {r.errorMessage && (
            <p className="text-xs text-red-500 mt-0.5">{r.errorMessage}</p>
          )}
        </div>
      ),
    },
    { key: 'sentAt', header: 'Sent At', render: (r) => <span className="text-xs text-gray-500">{r.sentAt ? formatDateTime(r.sentAt) : '—'}</span> },
  ];

  // ── Templates grouped by event ──
  const templatesByEvent = templates.reduce<Record<string, NotificationTemplate[]>>((acc, t) => {
    if (!acc[t.eventType]) acc[t.eventType] = [];
    acc[t.eventType].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Sent',  value: totalSent,  color: 'bg-blue-50',   icon: <Send className="w-4 h-4 text-blue-500" /> },
          { label: 'Delivered',   value: delivered,  color: 'bg-green-50',  icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
          { label: 'Failed',      value: failed,     color: 'bg-red-50',    icon: <XCircle className="w-4 h-4 text-red-500" /> },
          { label: 'SMS',         value: smsSent,    color: 'bg-emerald-50',icon: <MessageSquare className="w-4 h-4 text-emerald-500" /> },
          { label: 'Email',       value: emailSent,  color: 'bg-indigo-50', icon: <Mail className="w-4 h-4 text-indigo-500" /> },
        ].map((s) => (
          <div key={s.label} className="card p-3 flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', s.color)}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-base font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + action */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([['log', 'Notification Log'], ['templates', 'Templates'], ['settings', 'Channels']] as [PageTab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setPageTab(t)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                pageTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowSendModal(true); setSendingStatus('idle'); }}
          className="btn-primary btn-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Send Notification
        </button>
      </div>

      {/* ── Notification Log tab ── */}
      {pageTab === 'log' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Channel pills */}
            <div className="flex gap-1">
              {(['all', 'sms', 'email', 'push', 'whatsapp'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => { setChannelFilter(c); setPage(1); }}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                    channelFilter === c
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300',
                  )}
                >
                  {c === 'all' ? 'All Channels' : CHANNEL_CONFIG[c as NotificationChannel].label}
                </button>
              ))}
            </div>
            {/* Status pills */}
            <div className="flex gap-1">
              {(['all', 'delivered', 'sent', 'failed', 'pending'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                    statusFilter === s
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300',
                  )}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={logs}
            rowKey={(r) => r.id}
            loading={logsLoading}
            onSearch={(q) => { setSearch(q); setPage(1); }}
            pagination={{ page, pageSize: PAGE_SIZE, total: logTotal, onPageChange: setPage }}
          />
        </>
      )}

      {/* ── Templates tab ── */}
      {pageTab === 'templates' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-start gap-2">
            <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Templates are automatically triggered by system events. Variables like <code className="bg-blue-100 px-1 rounded">{'{name}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{amount}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{account}'}</code> are substituted at send time.</span>
          </div>

          {templatesLoading && (
            <div className="text-center py-8 text-gray-400 text-sm">Loading templates…</div>
          )}

          {!templatesLoading && Object.entries(templatesByEvent).map(([eventType, tmplList]) => {
            const evtCfg = EVENT_CONFIG[eventType as NotificationEventType];
            return (
              <div key={eventType} className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', evtCfg.color)}>
                    {evtCfg.label}
                  </span>
                  <span className="text-xs text-gray-400">{tmplList.length} template{tmplList.length > 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {tmplList.map((tmpl) => {
                    const chCfg = CHANNEL_CONFIG[tmpl.channel];
                    return (
                      <div key={tmpl.id} className="px-4 py-3 flex items-start gap-3">
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 mt-0.5', chCfg.color)}>
                          {chCfg.icon} {chCfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          {tmpl.subject && (
                            <p className="text-xs font-semibold text-gray-700 mb-0.5">Subject: {tmpl.subject}</p>
                          )}
                          <p className="text-xs text-gray-600 leading-relaxed">{tmpl.body}</p>
                        </div>
                        <button
                          onClick={() => toggleTemplate(tmpl.id)}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0',
                            tmpl.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                          )}
                          title={tmpl.isActive ? 'Click to disable' : 'Click to enable'}
                        >
                          {tmpl.isActive ? <><Eye className="w-3 h-3" /> Active</> : <><EyeOff className="w-3 h-3" /> Disabled</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Channels / Settings tab ── */}
      {pageTab === 'settings' && (
        <div className="space-y-4">
          {([
            { channel: 'sms' as const, provider: 'Africa\'s Talking', configured: true, description: 'SMS gateway for Kenya, send via short code 23789', balance: 'KES 4,850 credit remaining' },
            { channel: 'email' as const, provider: 'SendGrid', configured: true, description: 'Transactional email via SMTP. Sender: noreply@rumawasco.go.ke', balance: '9,200 emails/month free tier' },
            { channel: 'push' as const, provider: 'Firebase FCM', configured: false, description: 'Push notifications for the RUMAWASCO mobile app', balance: 'Not configured' },
            { channel: 'whatsapp' as const, provider: 'Twilio WhatsApp API', configured: false, description: 'WhatsApp Business API integration', balance: 'Not configured' },
          ] as const).map((ch) => {
            const cfg = CHANNEL_CONFIG[ch.channel];
            return (
              <div key={ch.channel} className="card p-5 flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-lg', cfg.color)}>
                  {cfg.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900">{cfg.label}</p>
                    <Badge label={ch.configured ? 'Active' : 'Not Configured'} variant={ch.configured ? 'green' : 'gray'} />
                  </div>
                  <p className="text-sm text-gray-600">{ch.provider} — {ch.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ch.balance}</p>
                </div>
                <button className={cn('btn-sm', ch.configured ? 'btn-secondary' : 'btn-primary')}>
                  <Settings className="w-3.5 h-3.5" /> {ch.configured ? 'Configure' : 'Setup'}
                </button>
              </div>
            );
          })}

          {/* Auto-trigger config */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Automatic Trigger Configuration
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {(Object.entries(EVENT_CONFIG) as [NotificationEventType, typeof EVENT_CONFIG[NotificationEventType]][]).map(([evt, evtCfg]) => (
                <div key={evt} className="flex items-center justify-between px-4 py-3">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', evtCfg.color)}>
                    {evtCfg.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {(['sms', 'email'] as NotificationChannel[]).map((ch) => {
                      const hasTemplate = templates.some((t) => t.eventType === evt && t.channel === ch && t.isActive);
                      const chCfg = CHANNEL_CONFIG[ch];
                      return (
                        <span
                          key={ch}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                            hasTemplate ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400',
                          )}
                        >
                          {chCfg.icon} {hasTemplate ? '✓' : '✗'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Send Modal ── */}
      <Modal
        open={showSendModal}
        onClose={() => { setShowSendModal(false); reset(); setSendingStatus('idle'); }}
        title="Send Notification"
        size="md"
        footer={
          sendingStatus === 'idle' ? (
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowSendModal(false); reset(); }} className="btn-secondary btn-sm">Cancel</button>
              <button form="send-form" type="submit" className="btn-primary btn-sm flex items-center gap-1.5">
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          ) : sendingStatus === 'sent' ? (
            <div className="flex justify-end">
              <button onClick={() => { setShowSendModal(false); reset(); setSendingStatus('idle'); }} className="btn-primary btn-sm">Done</button>
            </div>
          ) : null
        }
      >
        {sendingStatus === 'idle' && (
          <form id="send-form" onSubmit={handleSubmit(onSend)} className="space-y-4">
            <Input
              label="Account Number"
              placeholder="e.g. ACC-001234"
              {...register('accountNumber')}
              error={errors.accountNumber?.message}
            />
            <Select
              label="Notification Event"
              options={Object.entries(EVENT_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
              {...register('eventType')}
              error={errors.eventType?.message}
            />
            <Select
              label="Channel"
              options={Object.entries(CHANNEL_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
              {...register('channel')}
              error={errors.channel?.message}
            />
            {previewTemplate && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Template Preview</p>
                {previewTemplate.subject && (
                  <p className="text-xs font-medium text-gray-700 mb-1">Subject: {previewTemplate.subject}</p>
                )}
                <p className="text-xs text-gray-600 leading-relaxed">{previewTemplate.body}</p>
              </div>
            )}
            {!previewTemplate && watchedEvent && watchedChannel && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                No active template found for {EVENT_CONFIG[watchedEvent]?.label} via {CHANNEL_CONFIG[watchedChannel]?.label}.
              </div>
            )}
            <Input
              label="Custom Message (overrides template)"
              placeholder="Leave blank to use template"
              {...register('customMessage')}
            />
          </form>
        )}
        {sendingStatus === 'sending' && (
          <div className="py-8 text-center">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Sending notification...</p>
          </div>
        )}
        {sendingStatus === 'sent' && (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-bold text-gray-800">Notification sent successfully!</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
