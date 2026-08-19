import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText, Plus, Download, Send, Calendar, ChevronRight,
  CheckCircle, AlertCircle, Clock, XCircle, Zap,
} from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input, Select } from '@/shared/components/ui/Input';
import { calculateBill, generateBillNumber, formatBillingPeriodLabel } from '@/features/billing/lib/billingEngine';
import { formatCurrency, formatDate, cn } from '@/shared/utils/utils';
import { fireNotification } from '@/core/store/notificationStore';
import { billsApi, connectionsApi, tariffsApi } from '@/features/billing/api/billing';
import { billingPeriodsApi } from '@/features/billing/api/billingPeriods';
import { readingsApi } from '@/features/meters/api/meters';
import type { Bill, BillStatus, BillingPeriod, BillingPeriodStatus, Connection, Tariff, MeterReading, QueryParams } from '@/types';

// ─── Status config ───────────────────────────────────────────────────────────

const BILL_STATUS_CONFIG: Record<BillStatus, { label: string; variant: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     variant: 'gray',   icon: <FileText className="w-3.5 h-3.5" /> },
  pending:   { label: 'Pending',   variant: 'yellow', icon: <Clock className="w-3.5 h-3.5" /> },
  issued:    { label: 'Issued',    variant: 'blue',   icon: <Send className="w-3.5 h-3.5" /> },
  paid:      { label: 'Paid',      variant: 'green',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  partial:   { label: 'Partial',   variant: 'yellow', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  overdue:   { label: 'Overdue',   variant: 'red',    icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', variant: 'gray',   icon: <XCircle className="w-3.5 h-3.5" /> },
  void:      { label: 'Void',      variant: 'gray',   icon: <XCircle className="w-3.5 h-3.5" /> },
};

const PERIOD_STATUS_CONFIG: Record<BillingPeriodStatus, { label: string; variant: string }> = {
  scheduled: { label: 'Scheduled', variant: 'gray' },
  reading:   { label: 'Reading',   variant: 'blue' },
  billing:   { label: 'Billing',   variant: 'yellow' },
  completed: { label: 'Completed', variant: 'green' },
  cancelled: { label: 'Cancelled', variant: 'red' },
};

// ─── Generate Bill wizard schemas ────────────────────────────────────────────

const step1Schema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  billingPeriodStart: z.string().min(1, 'Period start is required'),
  billingPeriodEnd: z.string().min(1, 'Period end is required'),
  currentReading: z.coerce.number({ invalid_type_error: 'Must be a number' }).nonnegative('Must be ≥ 0'),
  dueDate: z.string().min(1, 'Due date is required'),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  penaltyAmount: z.coerce.number().min(0).default(0),
});
type Step1Values = z.infer<typeof step1Schema>;

// ─── New Billing Cycle schema ────────────────────────────────────────────────

const cycleSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  cycleType: z.enum(['monthly', 'bi_monthly', 'quarterly']),
  readingPeriodStart: z.string().min(1, 'Required'),
  readingPeriodEnd: z.string().min(1, 'Required'),
  billingDate: z.string().min(1, 'Required'),
  dueDate: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});
type CycleValues = z.infer<typeof cycleSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

type PageTab = 'bills' | 'cycles';
type StatusFilter = 'all' | BillStatus;

export const Bills = () => {
  const navigate = useNavigate();
  const [pageTab, setPageTab] = useState<PageTab>('bills');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsTotal, setBillsTotal] = useState(0);

  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);

  // Wizard state
  const [showGenerate, setShowGenerate] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [_wizardResolving, setWizardResolving] = useState(false);
  const [wizardPreview, setWizardPreview] = useState<{
    connection: Connection | null;
    tariff: Tariff | null;
    values: Step1Values;
    result: ReturnType<typeof calculateBill>;
    billNumber: string;
    previousReading: number;
  } | null>(null);

  // New cycle modal
  const [showNewCycle, setShowNewCycle] = useState(false);

  // ── Fetch bills ──
  const fetchBills = useCallback(async () => {
    setBillsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: PAGE_SIZE,
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await billsApi.list(params as QueryParams);
      setBills(res.data ?? []);
      setBillsTotal(res.pagination?.total ?? res.data?.length ?? 0);
    } catch (err) {
      console.error('Failed to fetch bills', err);
    } finally {
      setBillsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // ── Fetch billing periods ──
  const fetchPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    try {
      const res = await billingPeriodsApi.list({ limit: 100 });
      setPeriods(res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch billing periods', err);
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // ── Bill form ──
  const {
    register: reg1,
    handleSubmit: hs1,
    formState: { errors: err1 },
    reset: reset1,
  } = useForm<Step1Values>({ resolver: zodResolver(step1Schema) });

  const onStep1Submit = async (values: Step1Values) => {
    setWizardResolving(true);
    try {
      const connRes = await connectionsApi.list({ search: values.accountNumber.trim(), pageSize: 1 });
      const connection = connRes.data?.[0] ?? null;
      if (!connection) { alert('Account number not found'); return; }

      const tariff = connection.tariffId
        ? await tariffsApi.getOne(connection.tariffId)
        : null;
      if (!tariff) { alert('No tariff assigned to this connection'); return; }

      const readingsRes = await readingsApi.list({
        connectionId: connection.id,
        pageSize: 1,
        sortBy: 'readingDate',
        sortOrder: 'desc',
      });
      const latestReading: MeterReading | undefined = readingsRes.data?.[0];
      const previousReading = latestReading?.readingValue ?? 0;
      const consumption = Math.max(0, values.currentReading - previousReading);

      const result = calculateBill({
        consumption,
        tariff: {
          standingCharge: tariff.standingCharge,
          minimumCharge: tariff.minimumCharge,
          penaltyRate: tariff.penaltyRate,
          blocks: tariff.blocks,
        },
        discountPercent: values.discountPercent / 100,
        penaltyAmount: values.penaltyAmount,
      });

      setWizardPreview({ connection, tariff, values, result, billNumber: generateBillNumber(bills), previousReading });
      setWizardStep(2);
    } catch (err) {
      console.error('Wizard lookup failed', err);
    } finally {
      setWizardResolving(false);
    }
  };

  const onConfirmGenerate = async () => {
    if (!wizardPreview) return;
    const { connection, values, result, billNumber } = wizardPreview;

    try {
      await billsApi.generate(connection!.id, {
        month: new Date(values.billingPeriodStart).getMonth() + 1,
        year: new Date(values.billingPeriodStart).getFullYear(),
      });

      // Auto-trigger notification: new bill issued
      fireNotification({
        eventType: 'new_bill',
        customerId:   connection!.customerId,
        customerName: connection!.customerName ?? 'Customer',
        accountNumber: connection!.accountNumber,
        message: `Dear ${connection!.customerName ?? 'Customer'}, your water bill ${billNumber} of ${formatCurrency(result.totalAmount)} is due on ${formatDate(values.dueDate)}. Pay via M-Pesa Paybill 247247, Acc: ${connection!.accountNumber}. RUMAWASCO.`,
        subject: 'New Water Bill',
      });

      await fetchBills();
    } catch (err) {
      console.error('Failed to generate bill', err);
    }

    setShowGenerate(false);
    setWizardStep(1);
    setWizardPreview(null);
    reset1();
  };

  const closeWizard = () => {
    setShowGenerate(false);
    setWizardStep(1);
    setWizardPreview(null);
    reset1();
  };

  // ── Cycle form ──
  const {
    register: regC,
    handleSubmit: hsC,
    formState: { errors: errC },
    reset: resetC,
  } = useForm<CycleValues>({ resolver: zodResolver(cycleSchema), defaultValues: { cycleType: 'monthly' } });

  const onCycleSubmit = async (values: CycleValues) => {
    try {
      await billingPeriodsApi.create({
        ...values,
        status: 'scheduled',
      });
      await fetchPeriods();
    } catch (err) {
      console.error('Failed to create billing period', err);
    }
    setShowNewCycle(false);
    resetC();
  };

  // ── Stats (computed from loaded bills) ──
  const totalBills = billsTotal;
  const totalOutstanding = bills
    .filter((b) => b.balance > 0)
    .reduce((s, b) => s + b.balance, 0);
  const totalCollected = bills.reduce((s, b) => s + b.amountPaid, 0);
  const overdueCount = bills.filter((b) => b.status === 'overdue').length;

  // ── Status tab counts ──
  const statusCounts: Record<string, number> = { all: billsTotal };
  (['draft', 'pending', 'issued', 'paid', 'partial', 'overdue'] as BillStatus[]).forEach((s) => {
    statusCounts[s] = bills.filter((b) => b.status === s).length;
  });

  // ── Columns ──
  const columns: Column<Bill>[] = [
    {
      key: 'billNumber', header: 'Bill #',
      render: (r) => <span className="font-mono font-medium text-primary-600">{r.billNumber}</span>,
    },
    { key: 'customerName', header: 'Customer', render: (r) => r.customerName ?? '—' },
    { key: 'accountNumber', header: 'Account', render: (r) => <span className="font-mono text-xs">{r.accountNumber ?? '—'}</span> },
    {
      key: 'billingPeriodStart', header: 'Period',
      render: (r) => formatBillingPeriodLabel(r.billingPeriodStart, r.billingPeriodEnd),
    },
    { key: 'unitsConsumed', header: 'Units (m³)', render: (r) => r.unitsConsumed.toFixed(1) },
    {
      key: 'totalAmount', header: 'Total',
      render: (r) => <span className="font-medium">{formatCurrency(r.totalAmount)}</span>,
    },
    {
      key: 'amountPaid', header: 'Paid',
      render: (r) => <span className="text-green-600">{formatCurrency(r.amountPaid)}</span>,
    },
    {
      key: 'balance', header: 'Balance',
      render: (r) => (
        <span className={r.balance > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
          {formatCurrency(r.balance)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const cfg = BILL_STATUS_CONFIG[r.status];
        return <Badge label={cfg.label} variant={cfg.variant as any} />;
      },
    },
    { key: 'dueDate', header: 'Due Date', render: (r) => formatDate(r.dueDate) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/bills/${r.id}`)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="View & download PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          {r.status !== 'paid' && (
            <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Send to customer">
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => navigate(`/bills/${r.id}`)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
            title="View detail"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ── Billing Cycles columns ──
  const cycleColumns: Column<BillingPeriod>[] = [
    { key: 'name', header: 'Period', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    {
      key: 'cycleType', header: 'Cycle',
      render: (r) => <span className="capitalize text-sm">{r.cycleType.replace('_', '-')}</span>,
    },
    {
      key: 'readingPeriodStart', header: 'Reading Period',
      render: (r) => `${formatDate(r.readingPeriodStart)} – ${formatDate(r.readingPeriodEnd)}`,
    },
    { key: 'billingDate', header: 'Billing Date', render: (r) => formatDate(r.billingDate) },
    { key: 'dueDate', header: 'Due Date', render: (r) => formatDate(r.dueDate) },
    {
      key: 'billsGenerated', header: 'Bills',
      render: (r) => r.billsGenerated != null
        ? <span className="font-medium">{r.billsGenerated.toLocaleString()}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'totalAmount', header: 'Total Amount',
      render: (r) => r.totalAmount != null
        ? <span className="font-medium">{formatCurrency(r.totalAmount)}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const cfg = PERIOD_STATUS_CONFIG[r.status];
        return <Badge label={cfg.label} variant={cfg.variant as any} />;
      },
    },
    {
      key: 'actions', header: '',
      render: (r) => r.status === 'reading' || r.status === 'billing' ? (
        <button
          className="btn-sm btn-primary flex items-center gap-1.5"
          onClick={async () => {
            try {
              await billingPeriodsApi.generateBills(r.id);
              await fetchPeriods();
            } catch (err) {
              console.error('Failed to generate bills for period', err);
            }
          }}
        >
          <Zap className="w-3.5 h-3.5" /> Generate Bills
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bills', value: totalBills, icon: <FileText className="w-5 h-5 text-blue-500" />, color: 'bg-blue-50' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), icon: <AlertCircle className="w-5 h-5 text-red-500" />, color: 'bg-red-50' },
          { label: 'Collected', value: formatCurrency(totalCollected), icon: <CheckCircle className="w-5 h-5 text-green-500" />, color: 'bg-green-50' },
          { label: 'Overdue', value: overdueCount, icon: <XCircle className="w-5 h-5 text-orange-500" />, color: 'bg-orange-50' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Page tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['bills', 'cycles'] as PageTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setPageTab(t)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                pageTab === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t === 'bills' ? 'Bills' : 'Billing Cycles'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {pageTab === 'bills' && (
            <button onClick={() => setShowGenerate(true)} className="btn-primary btn-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Generate Bill
            </button>
          )}
          {pageTab === 'cycles' && (
            <button onClick={() => setShowNewCycle(true)} className="btn-primary btn-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> New Billing Cycle
            </button>
          )}
        </div>
      </div>

      {/* Bills tab */}
      {pageTab === 'bills' && (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {['all', 'draft', 'pending', 'issued', 'paid', 'partial', 'overdue'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s as StatusFilter); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  statusFilter === s
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300',
                )}
              >
                {s === 'all' ? 'All' : BILL_STATUS_CONFIG[s as BillStatus].label}
                <span className={cn('ml-1.5 px-1.5 py-0.5 rounded-full text-xs', statusFilter === s ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600')}>
                  {statusCounts[s] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={bills}
            rowKey={(r) => r.id}
            loading={billsLoading}
            onSearch={(q) => { setSearch(q); setPage(1); }}
            onRowClick={(r) => navigate(`/bills/${r.id}`)}
            pagination={{ page, pageSize: PAGE_SIZE, total: billsTotal, onPageChange: setPage }}
          />
        </>
      )}

      {/* Billing Cycles tab */}
      {pageTab === 'cycles' && (
        <DataTable
          columns={cycleColumns}
          data={periods}
          rowKey={(r) => r.id}
          loading={periodsLoading}
          onSearch={() => {}}
        />
      )}

      {/* ── Generate Bill Wizard ── */}
      <Modal
        open={showGenerate}
        onClose={closeWizard}
        title={wizardStep === 1 ? 'Generate Bill — Step 1 of 2' : 'Generate Bill — Step 2: Preview'}
        size="lg"
        footer={
          wizardStep === 1 ? (
            <div className="flex gap-2 justify-end">
              <button onClick={closeWizard} className="btn-secondary btn-sm">Cancel</button>
              <button form="step1-form" type="submit" className="btn-primary btn-sm">
                Preview Bill →
              </button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <button onClick={() => setWizardStep(1)} className="btn-secondary btn-sm">← Back</button>
              <button onClick={onConfirmGenerate} className="btn-primary btn-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Confirm & Issue
              </button>
            </div>
          )
        }
      >
        {wizardStep === 1 && (
          <form id="step1-form" onSubmit={hs1(onStep1Submit)} className="space-y-4">
            <Input
              label="Account Number"
              placeholder="e.g. ACC-001234"
              {...reg1('accountNumber')}
              error={err1.accountNumber?.message}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Billing Period Start"
                type="date"
                {...reg1('billingPeriodStart')}
                error={err1.billingPeriodStart?.message}
              />
              <Input
                label="Billing Period End"
                type="date"
                {...reg1('billingPeriodEnd')}
                error={err1.billingPeriodEnd?.message}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Current Reading (m³)"
                type="number"
                step="0.01"
                {...reg1('currentReading')}
                error={err1.currentReading?.message}
              />
              <Input
                label="Due Date"
                type="date"
                {...reg1('dueDate')}
                error={err1.dueDate?.message}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Discount (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={0}
                {...reg1('discountPercent')}
                error={err1.discountPercent?.message}
              />
              <Input
                label="Penalty Amount (KES)"
                type="number"
                step="0.01"
                min="0"
                defaultValue={0}
                {...reg1('penaltyAmount')}
                error={err1.penaltyAmount?.message}
              />
            </div>
          </form>
        )}

        {wizardStep === 2 && wizardPreview && (() => {
          const { connection, tariff, values, result, billNumber, previousReading } = wizardPreview;
          const consumption = Math.max(0, values.currentReading - previousReading);
          return (
            <div className="space-y-4">
              {/* Bill info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Bill Number</p>
                  <p className="font-mono font-bold text-gray-900">{billNumber}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Customer</p>
                  <p className="font-medium text-gray-900">{connection?.customerName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Billing Period</p>
                  <p className="font-medium">{formatBillingPeriodLabel(values.billingPeriodStart, values.billingPeriodEnd)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Consumption</p>
                  <p className="font-medium">{consumption.toFixed(2)} m³ ({previousReading.toFixed(1)} → {values.currentReading.toFixed(1)})</p>
                </div>
              </div>

              {/* IBT Breakdown */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">IBT Breakdown — {tariff?.name}</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Range</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Units</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Rate</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.ibtBreakdown.map((block, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-700">{block.range}</td>
                          <td className="px-3 py-2 text-right">{block.units.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">KES {block.rate.toFixed(2)}/m³</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(block.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-3 py-2 text-gray-600">Standing Charge</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(result.standingCharge)}</td>
                      </tr>
                      {result.sewerageCharge > 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-gray-600">Sewerage Surcharge</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(result.sewerageCharge)}</td>
                        </tr>
                      )}
                      {result.penalties > 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-orange-700">Late Payment Penalty</td>
                          <td className="px-3 py-2 text-right font-medium text-orange-700">{formatCurrency(result.penalties)}</td>
                        </tr>
                      )}
                      {result.discounts > 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-green-700">Discount</td>
                          <td className="px-3 py-2 text-right font-medium text-green-700">−{formatCurrency(result.discounts)}</td>
                        </tr>
                      )}
                      {result.vatAmount > 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-gray-600">VAT</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(result.vatAmount)}</td>
                        </tr>
                      )}
                      <tr className="bg-primary-50 font-bold">
                        <td colSpan={3} className="px-3 py-3 text-primary-900">Total Due</td>
                        <td className="px-3 py-3 text-right text-primary-900 text-base">{formatCurrency(result.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Due date: {formatDate(values.dueDate)}. Bill will be issued immediately on confirmation.
              </p>
            </div>
          );
        })()}
      </Modal>

      {/* ── New Billing Cycle ── */}
      <Modal
        open={showNewCycle}
        onClose={() => { setShowNewCycle(false); resetC(); }}
        title="New Billing Cycle"
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowNewCycle(false); resetC(); }} className="btn-secondary btn-sm">Cancel</button>
            <button form="cycle-form" type="submit" className="btn-primary btn-sm">Create Cycle</button>
          </div>
        }
      >
        <form id="cycle-form" onSubmit={hsC(onCycleSubmit)} className="space-y-4">
          <Input label="Period Name" placeholder="e.g. August 2026" {...regC('name')} error={errC.name?.message} />
          <Select
            label="Cycle Type"
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'bi_monthly', label: 'Bi-Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
            ]}
            {...regC('cycleType')}
            error={errC.cycleType?.message}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Reading Period Start" type="date" {...regC('readingPeriodStart')} error={errC.readingPeriodStart?.message} />
            <Input label="Reading Period End" type="date" {...regC('readingPeriodEnd')} error={errC.readingPeriodEnd?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Billing Date" type="date" {...regC('billingDate')} error={errC.billingDate?.message} />
            <Input label="Due Date" type="date" {...regC('dueDate')} error={errC.dueDate?.message} />
          </div>
          <Input label="Notes (optional)" placeholder="Any notes for this cycle" {...regC('notes')} />
        </form>
      </Modal>
    </div>
  );
};
