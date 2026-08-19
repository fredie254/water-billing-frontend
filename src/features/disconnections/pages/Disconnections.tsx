import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Zap, ZapOff, CheckCircle, Clock, ChevronDown,
  ChevronRight, Send, UserCheck, RefreshCw, Plus, FileText,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { disconnectionsApi } from '@/features/disconnections/api/disconnections';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/shared/utils/utils';
import type { DisconnectionOrder, DisconnectionStatus } from '@/types';

// ─── Config ──────────────────────────────────────────────────────────────────

type StatusGroup = 'active' | 'disconnected' | 'reconnecting' | 'closed';

const STATUS_CONFIG: Record<DisconnectionStatus, {
  label: string; variant: string; group: StatusGroup; step: number;
}> = {
  pending_reminder:       { label: 'Pending Reminder',    variant: 'gray',   group: 'active',       step: 1 },
  reminder_sent:          { label: 'Reminder Sent',       variant: 'yellow', group: 'active',       step: 2 },
  overdue:                { label: 'Overdue',             variant: 'yellow', group: 'active',       step: 3 },
  notice_issued:          { label: 'Notice Issued',       variant: 'orange', group: 'active',       step: 4 },
  pending_approval:       { label: 'Pending Approval',    variant: 'yellow', group: 'active',       step: 5 },
  approved:               { label: 'Approved',            variant: 'orange', group: 'active',       step: 6 },
  disconnected:           { label: 'Disconnected',        variant: 'red',    group: 'disconnected', step: 7 },
  payment_received:       { label: 'Payment Received',    variant: 'blue',   group: 'reconnecting', step: 8 },
  reconnection_requested: { label: 'Recon. Requested',   variant: 'blue',   group: 'reconnecting', step: 9 },
  reconnection_approved:  { label: 'Recon. Approved',    variant: 'green',  group: 'reconnecting', step: 10 },
  reconnected:            { label: 'Reconnected',         variant: 'green',  group: 'closed',       step: 11 },
  cancelled:              { label: 'Cancelled',           variant: 'gray',   group: 'closed',       step: 12 },
};

// Workflow steps for the visual pipeline
const WORKFLOW_STEPS: { label: string; statuses: DisconnectionStatus[] }[] = [
  { label: 'Outstanding Bill',     statuses: ['pending_reminder'] },
  { label: 'Reminder',             statuses: ['reminder_sent'] },
  { label: 'Overdue',              statuses: ['overdue'] },
  { label: 'Disconnection Notice', statuses: ['notice_issued'] },
  { label: 'Approval',             statuses: ['pending_approval', 'approved'] },
  { label: 'Disconnected',         statuses: ['disconnected', 'payment_received'] },
  { label: 'Reconnection',         statuses: ['reconnection_requested', 'reconnection_approved'] },
  { label: 'Restored',             statuses: ['reconnected'] },
];

// Next actions per status
const NEXT_ACTIONS: Partial<Record<DisconnectionStatus, { label: string; icon: React.ReactNode; toStatus: DisconnectionStatus; danger?: boolean }[]>> = {
  pending_reminder:       [{ label: 'Send Reminder',       icon: <Send className="w-3.5 h-3.5" />,       toStatus: 'reminder_sent' }],
  reminder_sent:          [{ label: 'Issue Notice',        icon: <FileText className="w-3.5 h-3.5" />,   toStatus: 'notice_issued' }],
  overdue:                [{ label: 'Issue Notice',        icon: <FileText className="w-3.5 h-3.5" />,   toStatus: 'notice_issued' }],
  notice_issued:          [{ label: 'Submit for Approval', icon: <ChevronRight className="w-3.5 h-3.5" />,toStatus: 'pending_approval' }],
  pending_approval:       [
    { label: 'Approve',  icon: <CheckCircle className="w-3.5 h-3.5" />, toStatus: 'approved' },
    { label: 'Cancel',   icon: <RefreshCw className="w-3.5 h-3.5" />,   toStatus: 'cancelled' },
  ],
  approved:               [{ label: 'Mark Disconnected',  icon: <ZapOff className="w-3.5 h-3.5" />,     toStatus: 'disconnected',           danger: true }],
  disconnected:           [{ label: 'Reconnection Request',icon: <Zap className="w-3.5 h-3.5" />,       toStatus: 'reconnection_requested' }],
  reconnection_requested: [
    { label: 'Approve Reconnection', icon: <CheckCircle className="w-3.5 h-3.5" />, toStatus: 'reconnection_approved' },
    { label: 'Cancel',               icon: <RefreshCw className="w-3.5 h-3.5" />,   toStatus: 'cancelled' },
  ],
  reconnection_approved:  [{ label: 'Mark Reconnected',   icon: <UserCheck className="w-3.5 h-3.5" />, toStatus: 'reconnected' }],
};

const NOTE_SCHEMA = z.object({ notes: z.string().optional(), performedBy: z.string().optional() });
type NoteValues = z.infer<typeof NOTE_SCHEMA>;

// Reconnection request fields
const RECONNECTION_SCHEMA = z.object({
  amountPaid: z.coerce.number().min(0),
  paymentReference: z.string().min(1, 'Payment reference is required'),
  notes: z.string().optional(),
});
type ReconnectionValues = z.infer<typeof RECONNECTION_SCHEMA>;

type GroupFilter = 'all' | StatusGroup;

// ─── Component ───────────────────────────────────────────────────────────────

export const Disconnections = () => {
  const [orders, setOrders] = useState<DisconnectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    order: DisconnectionOrder;
    toStatus: DisconnectionStatus;
    label: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<NoteValues>({ resolver: zodResolver(NOTE_SCHEMA) });
  const reconnForm = useForm<ReconnectionValues>({ resolver: zodResolver(RECONNECTION_SCHEMA) });

  // ── Data loading ──
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await disconnectionsApi.list({ pageSize: 200 });
      setOrders(res.data ?? []);
    } catch (err) {
      console.error('Failed to load disconnection orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Action handler — calls the appropriate API endpoint, then re-fetches ──
  const onAction = async (values: NoteValues) => {
    if (!actionModal) return;
    const { order, toStatus, label } = actionModal;
    const notes = values.notes;
    const performedBy = values.performedBy || 'Finance Officer';

    setSubmitting(true);
    try {
      switch (toStatus) {
        case 'reminder_sent':
          await disconnectionsApi.sendReminder(order.id, notes);
          break;
        case 'notice_issued':
          await disconnectionsApi.issueNotice(order.id, notes);
          break;
        case 'pending_approval':
          await disconnectionsApi.submitApproval(order.id, notes);
          break;
        case 'approved':
          await disconnectionsApi.approve(order.id, notes);
          break;
        case 'disconnected':
          await disconnectionsApi.execute({
            id: order.id,
            disconnectedAt: new Date().toISOString(),
            performedBy,
            notes,
          });
          break;
        case 'reconnection_approved':
          await disconnectionsApi.approveReconnection(order.id, notes);
          break;
        case 'reconnected':
          await disconnectionsApi.markReconnected({
            id: order.id,
            reconnectedAt: new Date().toISOString(),
            performedBy,
            notes,
          });
          break;
        case 'cancelled':
          await disconnectionsApi.cancel(order.id, notes ?? label);
          break;
        default:
          console.warn('No API call mapped for transition to', toStatus);
      }
      await fetchOrders();
    } catch (err) {
      console.error(`Failed to perform "${label}" on order ${order.id}`, err);
    } finally {
      setSubmitting(false);
      setActionModal(null);
      reset();
    }
  };

  // Reconnection request needs extra fields (amountPaid + paymentReference)
  const [reconnModal, setReconnModal] = useState<DisconnectionOrder | null>(null);

  const onReconnectionRequest = async (values: ReconnectionValues) => {
    if (!reconnModal) return;
    setSubmitting(true);
    try {
      await disconnectionsApi.requestReconnection(reconnModal.id, {
        amountPaid: values.amountPaid,
        paymentReference: values.paymentReference,
        notes: values.notes,
      });
      await fetchOrders();
    } catch (err) {
      console.error('Failed to request reconnection', err);
    } finally {
      setSubmitting(false);
      setReconnModal(null);
      reconnForm.reset();
    }
  };

  // ── Stats ──
  const counts: Record<StatusGroup, number> = {
    active:       orders.filter((o) => STATUS_CONFIG[o.status].group === 'active').length,
    disconnected: orders.filter((o) => STATUS_CONFIG[o.status].group === 'disconnected').length,
    reconnecting: orders.filter((o) => STATUS_CONFIG[o.status].group === 'reconnecting').length,
    closed:       orders.filter((o) => STATUS_CONFIG[o.status].group === 'closed').length,
  };
  const totalOutstanding = orders
    .filter((o) => STATUS_CONFIG[o.status].group !== 'closed')
    .reduce((s, o) => s + o.outstandingAmount, 0);

  // ── Filtering ──
  const filtered = orders.filter((o) => {
    if (groupFilter === 'all') return true;
    return STATUS_CONFIG[o.status].group === groupFilter;
  });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { key: 'active',       label: 'In Progress',  icon: <Clock className="w-5 h-5 text-yellow-500" />,  color: 'bg-yellow-50' },
          { key: 'disconnected', label: 'Disconnected', icon: <ZapOff className="w-5 h-5 text-red-500" />,    color: 'bg-red-50' },
          { key: 'reconnecting', label: 'Reconnecting', icon: <Zap className="w-5 h-5 text-blue-500" />,      color: 'bg-blue-50' },
          { key: 'closed',       label: 'Reconnected',  icon: <UserCheck className="w-5 h-5 text-green-500" />,color: 'bg-green-50' },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => setGroupFilter(s.key === groupFilter ? 'all' : s.key)}
            className={cn(
              'card p-4 flex items-center gap-3 text-left transition-all',
              groupFilter === s.key ? 'ring-2 ring-primary-400' : 'hover:shadow-md',
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{counts[s.key]}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Outstanding amount */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500">Total Outstanding in Workflow</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totalOutstanding)}</p>
        </div>
        <button className="btn-primary btn-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Disconnection Order
        </button>
      </div>

      {/* Workflow pipeline diagram */}
      <div className="card p-4 overflow-x-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Workflow Pipeline</p>
        <div className="flex items-center gap-1 min-w-max">
          {WORKFLOW_STEPS.map((step, i) => {
            const count = orders.filter((o) => step.statuses.includes(o.status)).length;
            return (
              <div key={step.label} className="flex items-center gap-1">
                <div className={cn(
                  'px-3 py-2 rounded-xl text-center min-w-[90px] border',
                  count > 0 ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-200',
                )}>
                  <p className={cn('text-xl font-bold', count > 0 ? 'text-primary-700' : 'text-gray-300')}>{count}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-tight">{step.label}</p>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['all', 'active', 'disconnected', 'reconnecting', 'closed'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGroupFilter(g)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              groupFilter === g
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300',
            )}
          >
            {g === 'all' ? `All (${orders.length})` : `${g.charAt(0).toUpperCase() + g.slice(1)} (${counts[g as StatusGroup]})`}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {loading && (
          <div className="card py-12 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-40" />
            <p>Loading disconnection orders…</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="card py-12 text-center text-gray-400">
            <ZapOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No orders in this category.</p>
          </div>
        )}
        {!loading && filtered.map((order) => {
          const stCfg = STATUS_CONFIG[order.status];
          const actions = NEXT_ACTIONS[order.status] ?? [];
          const isExpanded = expandedId === order.id;
          return (
            <div key={order.id} className="card overflow-hidden">
              {/* Order header */}
              <div className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{order.customerName}</p>
                    <span className="font-mono text-xs text-gray-500">{order.accountNumber}</span>
                    <Badge label={stCfg.label} variant={stCfg.variant as any} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{order.propertyAddress}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Outstanding</p>
                    <p className="font-bold text-red-700">{formatCurrency(order.outstandingAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Overdue</p>
                    <p className="font-semibold text-gray-800">{order.daysOverdue} days</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {actions.map((act) => {
                    // Reconnection request needs its own modal with extra fields
                    if (act.toStatus === 'reconnection_requested') {
                      return (
                        <button
                          key={act.toStatus}
                          onClick={() => { setReconnModal(order); reconnForm.reset(); }}
                          className="btn-sm btn-primary flex items-center gap-1.5"
                        >
                          {act.icon} {act.label}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={act.toStatus}
                        onClick={() => setActionModal({ order, toStatus: act.toStatus, label: act.label })}
                        className={cn(
                          'btn-sm flex items-center gap-1.5',
                          act.danger ? 'btn-danger' : 'btn-primary',
                        )}
                      >
                        {act.icon} {act.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="View audit trail"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Audit trail */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Audit Trail</p>
                  <div className="space-y-0">
                    {order.auditTrail.map((entry, idx) => {
                      const toStCfg = STATUS_CONFIG[entry.toStatus];
                      return (
                        <div key={entry.id} className="flex gap-3 pb-3">
                          {/* Timeline dot + line */}
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                              idx === order.auditTrail.length - 1
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-200 text-gray-600',
                            )}>
                              {idx + 1}
                            </div>
                            {idx < order.auditTrail.length - 1 && (
                              <div className="w-0.5 bg-gray-200 flex-1 my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800">{entry.action}</p>
                              <Badge label={toStCfg.label} variant={toStCfg.variant as any} />
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              By <span className="font-medium">{entry.performedBy}</span> · {formatDateTime(entry.createdAt)}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-gray-600 mt-1 italic">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Key dates */}
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    {order.reminderSentAt && <p>Reminder: {formatDate(order.reminderSentAt)}</p>}
                    {order.noticeSentAt && <p>Notice: {formatDate(order.noticeSentAt)}</p>}
                    {order.disconnectedAt && <p>Disconnected: {formatDate(order.disconnectedAt)} by {order.disconnectedBy}</p>}
                    {order.reconnectedAt && <p>Reconnected: {formatDate(order.reconnectedAt)}</p>}
                  </div>

                  {order.notes && (
                    <p className="mt-2 text-xs text-gray-500 italic border-t border-gray-200 pt-2">{order.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Action Confirmation Modal ── */}
      <Modal
        open={!!actionModal}
        onClose={() => { setActionModal(null); reset(); }}
        title={actionModal?.label ?? 'Confirm Action'}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setActionModal(null); reset(); }} className="btn-secondary btn-sm">Cancel</button>
            <button
              form="action-form"
              type="submit"
              disabled={submitting}
              className={cn('btn-sm flex items-center gap-1.5', actionModal && STATUS_CONFIG[actionModal.toStatus].variant === 'red' ? 'btn-danger' : 'btn-primary')}
            >
              <CheckCircle className="w-4 h-4" /> {submitting ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        }
      >
        {actionModal && (
          <form id="action-form" onSubmit={handleSubmit(onAction)} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <p className="font-semibold text-gray-900">{actionModal.order.customerName}</p>
              <p className="text-gray-500">{actionModal.order.accountNumber} · Outstanding: {formatCurrency(actionModal.order.outstandingAmount)}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Status change:</span>
              <Badge label={STATUS_CONFIG[actionModal.order.status].label} variant={STATUS_CONFIG[actionModal.order.status].variant as any} />
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <Badge label={STATUS_CONFIG[actionModal.toStatus].label} variant={STATUS_CONFIG[actionModal.toStatus].variant as any} />
            </div>
            <Input label="Notes (optional)" placeholder="Any relevant notes for the audit trail" {...register('notes')} />
            <Input label="Performed By" placeholder="Your name" defaultValue="Finance Officer" {...register('performedBy')} />
          </form>
        )}
      </Modal>

      {/* ── Reconnection Request Modal ── */}
      <Modal
        open={!!reconnModal}
        onClose={() => { setReconnModal(null); reconnForm.reset(); }}
        title="Reconnection Request"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setReconnModal(null); reconnForm.reset(); }} className="btn-secondary btn-sm">Cancel</button>
            <button
              form="reconn-form"
              type="submit"
              disabled={submitting}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" /> {submitting ? 'Saving…' : 'Submit Request'}
            </button>
          </div>
        }
      >
        {reconnModal && (
          <form id="reconn-form" onSubmit={reconnForm.handleSubmit(onReconnectionRequest)} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <p className="font-semibold text-gray-900">{reconnModal.customerName}</p>
              <p className="text-gray-500">{reconnModal.accountNumber} · Outstanding: {formatCurrency(reconnModal.outstandingAmount)}</p>
            </div>
            <Input
              label="Amount Paid (KES)"
              type="number"
              min={0}
              placeholder="0"
              {...reconnForm.register('amountPaid')}
              error={reconnForm.formState.errors.amountPaid?.message}
            />
            <Input
              label="Payment Reference"
              placeholder="e.g. RCT-2026-015"
              {...reconnForm.register('paymentReference')}
              error={reconnForm.formState.errors.paymentReference?.message}
            />
            <Input label="Notes (optional)" placeholder="Any relevant notes" {...reconnForm.register('notes')} />
          </form>
        )}
      </Modal>
    </div>
  );
};
