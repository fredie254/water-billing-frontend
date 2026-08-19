import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar, CheckCircle, Plus, Send, UserX, ChevronRight, RefreshCw,
} from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { arrearsApi, paymentPlansApi } from '@/features/arrears/api/arrears';
import { formatCurrency, formatDate, cn } from '@/shared/utils/utils';
import type { PaymentPlan, PaymentPlanStatus, AgingBucket } from '@/types';

// ─── Aging helpers ────────────────────────────────────────────────────────────

const BUCKET_CONFIG: Record<AgingBucket, { label: string; color: string; badgeVariant: string }> = {
  current:  { label: 'Current',    color: 'bg-green-50 border-green-200',   badgeVariant: 'green' },
  '1_30':   { label: '1–30 days',  color: 'bg-yellow-50 border-yellow-200', badgeVariant: 'yellow' },
  '31_60':  { label: '31–60 days', color: 'bg-orange-50 border-orange-200', badgeVariant: 'yellow' },
  '61_90':  { label: '61–90 days', color: 'bg-red-50 border-red-200',       badgeVariant: 'red' },
  '90_plus':{ label: '90+ days',   color: 'bg-red-100 border-red-300',      badgeVariant: 'red' },
};

// Normalise bucket key: API may return "over_90", types use "90_plus"
function normaliseBucket(raw: string): AgingBucket {
  if (raw === 'over_90') return '90_plus';
  if (['current', '1_30', '31_60', '61_90', '90_plus'].includes(raw)) return raw as AgingBucket;
  return '90_plus';
}

const PLAN_STATUS: Record<PaymentPlanStatus, { label: string; variant: string }> = {
  active:    { label: 'Active',    variant: 'green' },
  completed: { label: 'Completed', variant: 'blue' },
  defaulted: { label: 'Defaulted', variant: 'red' },
  cancelled: { label: 'Cancelled', variant: 'gray' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArrearsAccount {
  customerId: string;
  customerName: string;
  accountNumber: string;
  balance: number;
  oldestBillDate?: string;
  daysOverdue: number;
  bucket: AgingBucket;
  connectionId?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  hasPlan?: boolean;
}

interface ArrearsSummary {
  current: number;
  '1_30': number;
  '31_60': number;
  '61_90': number;
  '90_plus': number;
  total: number;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const planSchema = z.object({
  customerId:   z.string().min(1, 'Select an account'),
  connectionId: z.string().optional(),
  totalAmount:  z.coerce.number().min(0),
  installments: z.coerce.number().int().min(1).max(12),
  startDate:    z.string().min(1, 'Required'),
  notes:        z.string().optional(),
});
type PlanValues = z.infer<typeof planSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

type PageTab = 'aging' | 'plans';

export const Arrears = () => {
  const navigate = useNavigate();

  // ── Arrears state ──
  const [accounts, setAccounts] = useState<ArrearsAccount[]>([]);
  const [summary, setSummary] = useState<ArrearsSummary | null>(null);
  const [loadingArrears, setLoadingArrears] = useState(true);

  // ── Plans state ──
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansTotal, setPlansTotal] = useState(0);
  const [plansPage, setPlansPage] = useState(1);
  const PLANS_PAGE_SIZE = 10;

  // ── UI state ──
  const [pageTab, setPageTab] = useState<PageTab>('aging');
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<'all' | AgingBucket>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    defaultValues: { installments: 3, startDate: '2026-09-01', totalAmount: 0 },
  });
  const watchedInstallments = watch('installments');
  const watchedCustomerId = watch('customerId');
  const watchedTotalAmount = watch('totalAmount');
  const previewAccount = accounts.find((a) => a.customerId === watchedCustomerId);
  const installmentAmount = watchedTotalAmount > 0 && watchedInstallments > 0
    ? (watchedTotalAmount / watchedInstallments).toFixed(2)
    : null;

  // ── Data loading ──
  const fetchArrears = useCallback(async (q?: string, bucket?: string) => {
    setLoadingArrears(true);
    try {
      const params: Record<string, string | number | undefined> = { pageSize: 500 };
      if (q) params.search = q;
      if (bucket && bucket !== 'all') params.bucket = bucket === '90_plus' ? 'over_90' : bucket;
      const res = await arrearsApi.list(params);
      const raw = res?.data ?? res;
      const rawAccounts: any[] = raw?.accounts ?? [];
      const rawSummary = raw?.summary ?? null;

      setAccounts(
        rawAccounts.map((a: any) => ({
          customerId: a.customerId,
          customerName: a.customerName ?? '—',
          accountNumber: a.accountNumber ?? '—',
          balance: a.balance ?? 0,
          oldestBillDate: a.oldestBillDate,
          daysOverdue: a.daysOverdue ?? 0,
          bucket: normaliseBucket(a.bucket ?? 'current'),
          connectionId: a.connectionId,
          lastPaymentDate: a.lastPaymentDate,
          lastPaymentAmount: a.lastPaymentAmount,
          hasPlan: a.hasPlan ?? false,
        })),
      );

      if (rawSummary) {
        setSummary({
          current:  rawSummary.current ?? 0,
          '1_30':   rawSummary['1_30'] ?? 0,
          '31_60':  rawSummary['31_60'] ?? 0,
          '61_90':  rawSummary['61_90'] ?? 0,
          '90_plus': rawSummary['90_plus'] ?? rawSummary['over_90'] ?? 0,
          total:    rawSummary.total ?? 0,
        });
      }
    } catch (err) {
      console.error('Failed to load arrears', err);
    } finally {
      setLoadingArrears(false);
    }
  }, []);

  const fetchPlans = useCallback(async (p = 1) => {
    setLoadingPlans(true);
    try {
      const res = await paymentPlansApi.list({ page: p, pageSize: PLANS_PAGE_SIZE });
      setPlans(res.data ?? []);
      setPlansTotal(res.pagination?.total ?? 0);
    } catch (err) {
      console.error('Failed to load payment plans', err);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => { fetchArrears(); fetchPlans(); }, [fetchArrears, fetchPlans]);

  // Re-fetch arrears when search or bucket changes (debounce via page state)
  useEffect(() => {
    fetchArrears(search, bucketFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, bucketFilter]);

  const onCreatePlan = async (values: PlanValues) => {
    const account = accounts.find((a) => a.customerId === values.customerId);
    if (!account) return;
    setSubmitting(true);
    try {
      await paymentPlansApi.create({
        customerId: values.customerId,
        connectionId: account.connectionId ?? values.connectionId ?? '',
        billIds: [],
        totalAmount: values.totalAmount,
        installments: values.installments,
        startDate: values.startDate,
        notes: values.notes,
      });
      await fetchPlans(1);
      setPlansPage(1);
      setShowPlanModal(false);
      reset();
    } catch (err) {
      console.error('Failed to create payment plan', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Aging summary cards ──
  const bucketTotals = (['current', '1_30', '31_60', '61_90', '90_plus'] as AgingBucket[]).map((b) => {
    // Use server summary when available, otherwise derive from loaded accounts
    const serverTotal = summary?.[b] ?? null;
    const clientAccounts = accounts.filter((a) => a.bucket === b);
    return {
      bucket: b,
      count: clientAccounts.length,
      total: serverTotal ?? clientAccounts.reduce((s, a) => s + a.balance, 0),
    };
  });
  const grandTotal = summary?.total ?? accounts.reduce((s, a) => s + a.balance, 0);

  // ── Client-side filtering (search + bucket already applied server-side, but
  //    we keep client filtering for instant UX before the next fetch settles) ──
  const filtered = accounts.filter((a) => {
    const matchSearch = search === '' ||
      a.customerName.toLowerCase().includes(search.toLowerCase()) ||
      a.accountNumber.includes(search);
    const matchBucket = bucketFilter === 'all' || a.bucket === bucketFilter;
    return matchSearch && matchBucket;
  });
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Aging columns ──
  const columns: Column<ArrearsAccount>[] = [
    {
      key: 'customerName', header: 'Customer / Account',
      render: (r) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{r.customerName}</p>
          <p className="text-xs font-mono text-gray-400">{r.accountNumber}</p>
        </div>
      ),
    },
    {
      key: 'bucket', header: 'Age',
      render: (r) => {
        const cfg = BUCKET_CONFIG[r.bucket];
        return (
          <div>
            <Badge label={cfg.label} variant={cfg.badgeVariant as any} />
            {r.daysOverdue > 0 && <p className="text-xs text-gray-400 mt-0.5">{r.daysOverdue} days overdue</p>}
          </div>
        );
      },
    },
    {
      key: 'balance', header: 'Balance Due',
      render: (r) => <span className="font-bold text-red-700">{formatCurrency(r.balance)}</span>,
    },
    {
      key: 'lastPayment', header: 'Last Payment',
      render: (r) => r.lastPaymentDate ? (
        <div>
          {r.lastPaymentAmount != null && <p className="text-xs text-gray-700">{formatCurrency(r.lastPaymentAmount)}</p>}
          <p className="text-xs text-gray-400">{formatDate(r.lastPaymentDate)}</p>
        </div>
      ) : <span className="text-gray-400 text-xs">None</span>,
    },
    {
      key: 'oldestBillDate', header: 'Oldest Bill',
      render: (r) => r.oldestBillDate
        ? <span className="text-xs text-gray-500">{formatDate(r.oldestBillDate)}</span>
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'plan', header: 'Plan',
      render: (r) => r.hasPlan
        ? <Badge label="Has Plan" variant="blue" />
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPlanModal(true);
              reset({
                customerId: r.customerId,
                connectionId: r.connectionId,
                totalAmount: r.balance,
                installments: 3,
                startDate: '2026-09-01',
              });
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Create payment plan"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Send reminder">
            <Send className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${r.customerId}`); }}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
            title="View customer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ── Plans columns ──
  const planColumns: Column<PaymentPlan>[] = [
    {
      key: 'customerName', header: 'Customer',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.customerName}</p>
          <p className="text-xs font-mono text-gray-400">{r.accountNumber}</p>
        </div>
      ),
    },
    { key: 'totalAmount', header: 'Total', render: (r) => formatCurrency(r.totalAmount) },
    { key: 'paidAmount', header: 'Paid', render: (r) => <span className="text-green-700">{formatCurrency(r.paidAmount)}</span> },
    { key: 'remainingAmount', header: 'Remaining', render: (r) => <span className="font-bold text-red-700">{formatCurrency(r.remainingAmount)}</span> },
    {
      key: 'installments', header: 'Installments',
      render: (r) => {
        const paid = r.installments.filter((i) => i.status === 'paid').length;
        return <span className="text-sm">{paid}/{r.installments.length}</span>;
      },
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const cfg = PLAN_STATUS[r.status];
        return <Badge label={cfg.label} variant={cfg.variant as any} />;
      },
    },
    {
      key: 'nextDue', header: 'Next Due',
      render: (r) => {
        const next = r.installments.find((i) => i.status === 'pending');
        return next ? (
          <div>
            <p className="text-sm font-medium">{formatCurrency(next.amount)}</p>
            <p className="text-xs text-gray-400">{formatDate(next.dueDate)}</p>
          </div>
        ) : <span className="text-gray-400 text-xs">—</span>;
      },
    },
    { key: 'approvedBy', header: 'Approved By', render: (r) => <span className="text-xs text-gray-500">{r.approvedBy ?? '—'}</span> },
    { key: 'createdAt', header: 'Created', render: (r) => <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Grand total */}
      <div className="card p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">Total Outstanding Arrears</p>
          <p className="text-3xl font-bold text-red-700">{formatCurrency(grandTotal)}</p>
          <p className="text-sm text-gray-500 mt-1">{accounts.length} overdue account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPlanModal(true)}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" /> New Payment Plan
          </button>
          <button className="btn-danger btn-sm flex items-center gap-1.5">
            <UserX className="w-4 h-4" /> Generate Disconnection List
          </button>
        </div>
      </div>

      {/* Aging summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {bucketTotals.map(({ bucket, count, total }) => {
          const cfg = BUCKET_CONFIG[bucket];
          return (
            <button
              key={bucket}
              onClick={() => { setBucketFilter(bucket === bucketFilter ? 'all' : bucket); setPage(1); }}
              className={cn(
                'card p-4 text-left transition-all border-2',
                bucketFilter === bucket ? 'border-primary-400 ring-2 ring-primary-100' : cfg.color,
                'hover:border-primary-300',
              )}
            >
              <p className="text-xs font-semibold text-gray-500 mb-1">{cfg.label}</p>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-600 mt-1">{formatCurrency(total)}</p>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([['aging', 'Aging Report'], ['plans', 'Payment Plans']] as [PageTab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setPageTab(t)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                pageTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
              {t === 'plans' && <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{plansTotal || plans.length}</span>}
            </button>
          ))}
        </div>
        {pageTab === 'plans' && (
          <button onClick={() => setShowPlanModal(true)} className="btn-primary btn-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        )}
      </div>

      {/* Aging table */}
      {pageTab === 'aging' && (
        <DataTable
          columns={columns}
          data={paginated}
          rowKey={(r) => r.customerId}
          loading={loadingArrears}
          onSearch={(q) => { setSearch(q); setPage(1); }}
          onRowClick={(r) => navigate(`/customers/${r.customerId}`)}
          pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        />
      )}

      {/* Payment plans */}
      {pageTab === 'plans' && (
        <DataTable
          columns={planColumns}
          data={plans}
          rowKey={(r) => r.id}
          loading={loadingPlans}
          onSearch={() => {}}
          pagination={{ page: plansPage, pageSize: PLANS_PAGE_SIZE, total: plansTotal, onPageChange: (p) => { setPlansPage(p); fetchPlans(p); } }}
        />
      )}

      {/* ── New Payment Plan Modal ── */}
      <Modal
        open={showPlanModal}
        onClose={() => { setShowPlanModal(false); reset(); }}
        title="Create Payment Plan"
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowPlanModal(false); reset(); }} className="btn-secondary btn-sm">Cancel</button>
            <button form="plan-form" type="submit" disabled={submitting} className="btn-primary btn-sm flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> {submitting ? 'Creating…' : 'Create Plan'}
            </button>
          </div>
        }
      >
        <form id="plan-form" onSubmit={handleSubmit(onCreatePlan)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Account in Arrears</label>
            {loadingArrears ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading accounts…
              </div>
            ) : (
              <select className="input-base" {...register('customerId')}>
                <option value="">— Select an account —</option>
                {accounts.filter((a) => a.balance > 0).map((a) => (
                  <option key={a.customerId} value={a.customerId}>
                    {a.accountNumber} — {a.customerName} ({formatCurrency(a.balance)} due)
                  </option>
                ))}
              </select>
            )}
            {errors.customerId && <p className="text-xs text-red-500">{errors.customerId.message}</p>}
          </div>

          {previewAccount && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <p className="font-medium text-amber-900">{previewAccount.customerName}</p>
              <p className="text-amber-700">{previewAccount.accountNumber} · Balance: <strong>{formatCurrency(previewAccount.balance)}</strong></p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total Amount (KES)"
              type="number"
              min={0}
              {...register('totalAmount')}
              error={errors.totalAmount?.message}
            />
            <Input
              label="Number of Installments"
              type="number"
              min={1}
              max={12}
              {...register('installments')}
              error={errors.installments?.message}
            />
          </div>

          <Input
            label="First Payment Date"
            type="date"
            {...register('startDate')}
            error={errors.startDate?.message}
          />

          {installmentAmount && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
              <p className="text-blue-800">
                <strong>{watchedInstallments}</strong> installments of approximately{' '}
                <strong>KES {installmentAmount}</strong> each.
              </p>
            </div>
          )}

          <Input label="Notes (optional)" placeholder="Any notes for this plan" {...register('notes')} />
        </form>
      </Modal>
    </div>
  );
};
