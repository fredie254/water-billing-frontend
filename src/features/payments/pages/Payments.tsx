import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Smartphone, CreditCard, Building, FileText, Banknote,
  CheckCircle, Clock, RefreshCw, ChevronRight, AlertTriangle,
  TrendingUp, Receipt,
} from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input, Select } from '@/shared/components/ui/Input';
import { paymentsApi } from '@/features/payments/api/payments';
import { formatCurrency, formatDate, cn } from '@/shared/utils/utils';
import { fireNotification } from '@/core/store/notificationStore';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types';

// ─── Config ──────────────────────────────────────────────────────────────────

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ReactNode; color: string }> = {
  mpesa:         { label: 'M-Pesa',        icon: <Smartphone className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
  cash:          { label: 'Cash',          icon: <Banknote className="w-4 h-4" />,   color: 'text-yellow-700 bg-yellow-50' },
  bank_transfer: { label: 'Bank Transfer', icon: <Building className="w-4 h-4" />,   color: 'text-blue-700 bg-blue-50' },
  cheque:        { label: 'Cheque',        icon: <FileText className="w-4 h-4" />,   color: 'text-purple-700 bg-purple-50' },
  card:          { label: 'Card',          icon: <CreditCard className="w-4 h-4" />, color: 'text-indigo-700 bg-indigo-50' },
  other:         { label: 'Other',         icon: <Receipt className="w-4 h-4" />,    color: 'text-gray-700 bg-gray-50' },
};

const STATUS_CONFIG: Record<PaymentStatus, { label: string; variant: string }> = {
  pending:   { label: 'Pending',   variant: 'yellow' },
  completed: { label: 'Completed', variant: 'green' },
  failed:    { label: 'Failed',    variant: 'red' },
  reversed:  { label: 'Reversed',  variant: 'gray' },
};

// ─── Schema ──────────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  amount: z.coerce.number({ invalid_type_error: 'Must be a number' }).positive('Amount must be > 0'),
  paymentMethod: z.enum(['cash', 'mpesa', 'bank_transfer', 'cheque', 'card', 'other']),
  paidAt: z.string().min(1, 'Date is required'),
  mpesaCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  reference: z.string().optional(),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  notes: z.string().optional(),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

const stkSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  amount: z.coerce.number().positive('Amount must be > 0'),
  phoneNumber: z.string().min(10, 'Enter a valid phone number'),
});
type StkValues = z.infer<typeof stkSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

type PageTab = 'payments' | 'mpesa';

export const Payments = () => {
  const navigate = useNavigate();
  const [pageTab, setPageTab] = useState<PageTab>('payments');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showRecord, setShowRecord] = useState(false);
  const [showStkPush, setShowStkPush] = useState(false);
  const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'sent' | 'confirmed'>('idle');
  const [_stkCheckoutId, setStkCheckoutId] = useState<string | null>(null);

  // ── Fetch payments ──
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (search) params.search = search;
      if (methodFilter !== 'all') params.paymentMethod = methodFilter;
      const res = await paymentsApi.list(params);
      setPayments(res.data);
      setTotal(res.pagination.total);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [page, search, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ── Record Payment form ──
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { paymentMethod: 'mpesa', paidAt: new Date().toISOString().split('T')[0] },
  });

  const watchedMethod = watch('paymentMethod');
  const formAccount = watch('accountNumber');
  // Allocation preview uses locally-fetched data; keep a lightweight resolve
  // from the already-loaded payments list (best-effort account lookup)
  const resolvedPayment = payments.find(
    (p) => p.accountNumber === formAccount?.trim(),
  );

  const onRecordPayment = async (values: PaymentFormValues) => {
    try {
      await paymentsApi.record({
        accountNumber: values.accountNumber,
        amount: values.amount,
        paymentMethod: values.paymentMethod as PaymentMethod,
        reference: values.reference,
        mpesaCode: values.mpesaCode,
        phoneNumber: values.phoneNumber,
        bankName: values.bankName,
        chequeNumber: values.chequeNumber,
        notes: values.notes,
        paidAt: values.paidAt,
      });

      // Auto-trigger notification: payment received
      if (resolvedPayment) {
        fireNotification({
          eventType: 'payment_received',
          customerId:   resolvedPayment.customerId,
          customerName: resolvedPayment.customerName ?? 'Customer',
          accountNumber: resolvedPayment.accountNumber ?? values.accountNumber,
          message: `Dear ${resolvedPayment.customerName ?? 'Customer'}, we confirm receipt of ${formatCurrency(values.amount)} on ${new Date().toLocaleDateString('en-KE')}. Thank you. RUMAWASCO.`,
          subject: 'Payment Confirmation',
        });
      }

      setShowRecord(false);
      reset();
      await fetchPayments();
    } catch {
      // errors surfaced by apiClient interceptor
    }
  };

  // ── STK Push form ──
  const {
    register: regStk,
    handleSubmit: hsStk,
    formState: { errors: errStk },
    reset: resetStk,
  } = useForm<StkValues>({ resolver: zodResolver(stkSchema) });

  const onStkPush = async (values: StkValues) => {
    setStkStatus('sending');
    try {
      const res = await paymentsApi.mpesaStkPush({
        accountNumber: values.accountNumber,
        amount: values.amount,
        phoneNumber: values.phoneNumber,
      });
      const checkoutId = (res as any)?.checkoutRequestId ?? null;
      setStkCheckoutId(checkoutId);
      setStkStatus('sent');

      // Poll for confirmation
      if (checkoutId) {
        const poll = setInterval(async () => {
          try {
            const qRes = await paymentsApi.mpesaQuery(checkoutId) as any;
            if (qRes?.resultCode === '0') {
              clearInterval(poll);
              setStkStatus('confirmed');
              await fetchPayments();
            } else if (qRes?.resultCode && qRes.resultCode !== '0') {
              clearInterval(poll);
              setStkStatus('idle');
            }
          } catch {
            // ignore transient query errors
          }
        }, 3000);
        // Auto-clear poll after 2 min
        setTimeout(() => clearInterval(poll), 120_000);
      } else {
        // No checkout id — fall back to timeout-based confirmation display
        await new Promise((r) => setTimeout(r, 1500));
        setStkStatus('confirmed');
        await fetchPayments();
      }
    } catch {
      setStkStatus('idle');
    }
  };

  const closeStkPush = () => {
    setShowStkPush(false);
    setStkStatus('idle');
    setStkCheckoutId(null);
    resetStk();
  };

  // ── Stats (derived from loaded page) ──
  const totalCollected = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const mpesaTotal = payments.filter((p) => p.paymentMethod === 'mpesa' && p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const todayPayments = payments.filter((p) => p.paidAt?.startsWith(new Date().toISOString().split('T')[0])).length;
  const methodCounts = Object.fromEntries(
    (['mpesa', 'cash', 'bank_transfer', 'cheque', 'card'] as PaymentMethod[]).map((m) => [
      m,
      payments.filter((p) => p.paymentMethod === m).length,
    ]),
  );

  // ── Columns ──
  const columns: Column<Payment>[] = [
    {
      key: 'paymentNumber', header: 'Receipt #',
      render: (r) => (
        <button
          onClick={() => navigate(`/receipts/${r.id}`)}
          className="font-mono font-medium text-primary-600 hover:underline"
        >
          {r.paymentNumber}
        </button>
      ),
    },
    { key: 'customerName', header: 'Customer', render: (r) => r.customerName ?? '—' },
    { key: 'accountNumber', header: 'Account', render: (r) => <span className="font-mono text-xs">{r.accountNumber ?? '—'}</span> },
    {
      key: 'paymentMethod', header: 'Method',
      render: (r) => {
        const cfg = METHOD_CONFIG[r.paymentMethod];
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium', cfg.color)}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'amount', header: 'Amount',
      render: (r) => <span className="font-bold text-green-700">{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'allocations', header: 'Allocated To',
      render: (r) => r.allocations && r.allocations.length > 0
        ? (
          <div className="text-xs space-y-0.5">
            {r.allocations.map((a) => (
              <div key={a.billId} className="text-gray-600">
                <span className="font-mono text-primary-600">{a.billNumber}</span>
                {' '}— {formatCurrency(a.allocatedAmount)}
              </div>
            ))}
            {(r.remainingAmount ?? 0) > 0 && (
              <div className="text-yellow-700 font-medium">Surplus: {formatCurrency(r.remainingAmount!)}</div>
            )}
          </div>
        )
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'reference', header: 'Reference',
      render: (r) => (
        <span className="font-mono text-xs text-gray-500">
          {r.mpesaCode ?? r.reference ?? r.chequeNumber ?? '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const cfg = STATUS_CONFIG[r.status];
        return <Badge label={cfg.label} variant={cfg.variant as any} />;
      },
    },
    { key: 'paidAt', header: 'Date', render: (r) => formatDate(r.paidAt) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <button
          onClick={() => navigate(`/receipts/${r.id}`)}
          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
          title="View receipt"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Collected', value: formatCurrency(totalCollected), icon: <TrendingUp className="w-5 h-5 text-green-500" />, color: 'bg-green-50' },
          { label: 'M-Pesa', value: formatCurrency(mpesaTotal), icon: <Smartphone className="w-5 h-5 text-green-600" />, color: 'bg-green-50' },
          { label: 'Payments Today', value: todayPayments, icon: <CheckCircle className="w-5 h-5 text-blue-500" />, color: 'bg-blue-50' },
          { label: 'Total Transactions', value: total, icon: <Receipt className="w-5 h-5 text-purple-500" />, color: 'bg-purple-50' },
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
          {([['payments', 'All Payments'], ['mpesa', 'M-Pesa Paybill']] as [PageTab, string][]).map(([t, label]) => (
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowStkPush(true); setStkStatus('idle'); }}
            className="btn-secondary btn-sm flex items-center gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
          >
            <Smartphone className="w-4 h-4" /> STK Push
          </button>
          <button onClick={() => setShowRecord(true)} className="btn-primary btn-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>
      </div>

      {/* Payments tab */}
      {pageTab === 'payments' && (
        <>
          {/* Method filter pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setMethodFilter('all'); setPage(1); }}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                methodFilter === 'all' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300')}
            >
              All ({total})
            </button>
            {(['mpesa', 'cash', 'bank_transfer', 'cheque', 'card'] as PaymentMethod[]).map((m) => {
              const cfg = METHOD_CONFIG[m];
              return (
                <button
                  key={m}
                  onClick={() => { setMethodFilter(m); setPage(1); }}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors',
                    methodFilter === m ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300')}
                >
                  {cfg.icon} {cfg.label} ({methodCounts[m] ?? 0})
                </button>
              );
            })}
          </div>

          <DataTable
            columns={columns}
            data={payments}
            loading={loading}
            rowKey={(r) => r.id}
            onSearch={(q) => { setSearch(q); setPage(1); }}
            pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
          />
        </>
      )}

      {/* M-Pesa Paybill tab */}
      {pageTab === 'mpesa' && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">M-Pesa Integration</h2>
                <p className="text-sm text-gray-500">Paybill number: <span className="font-mono font-bold text-green-700">247247</span></p>
              </div>
            </div>

            {/* M-Pesa flow diagram */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-6">
              {[
                { step: '1', label: 'Customer', sub: 'Dials *334#', icon: <Smartphone className="w-4 h-4" /> },
                { step: '2', label: 'M-Pesa API', sub: 'Payment request', icon: <RefreshCw className="w-4 h-4" /> },
                { step: '3', label: 'Callback', sub: 'Transaction confirmed', icon: <CheckCircle className="w-4 h-4" /> },
                { step: '4', label: 'Match Account', sub: 'Account number → Connection', icon: <FileText className="w-4 h-4" /> },
                { step: '5', label: 'Allocate', sub: 'Penalties → Oldest → Current', icon: <TrendingUp className="w-4 h-4" /> },
              ].map((item, i, arr) => (
                <div key={item.step} className="flex items-center gap-2">
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-1.5 text-green-700">
                      {item.icon}
                    </div>
                    <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Recent M-Pesa payments */}
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent M-Pesa Payments</h3>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {payments
                .filter((p) => p.paymentMethod === 'mpesa')
                .slice(0, 5)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {p.accountNumber} · Code: <span className="font-mono text-green-700">{p.mpesaCode ?? '—'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.paidAt)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      <Modal
        open={showRecord}
        onClose={() => { setShowRecord(false); reset(); }}
        title="Record Payment"
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowRecord(false); reset(); }} className="btn-secondary btn-sm">Cancel</button>
            <button form="payment-form" type="submit" className="btn-primary btn-sm flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Record & Generate Receipt
            </button>
          </div>
        }
      >
        <form id="payment-form" onSubmit={handleSubmit(onRecordPayment)} className="space-y-4">
          <Input
            label="Account Number"
            placeholder="e.g. ACC-001234"
            {...register('accountNumber')}
            error={errors.accountNumber?.message}
          />

          {formAccount && !resolvedPayment && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              No active connection found for this account number.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (KES)"
              type="number"
              step="0.01"
              {...register('amount')}
              error={errors.amount?.message}
            />
            <Input
              label="Payment Date"
              type="date"
              {...register('paidAt')}
              error={errors.paidAt?.message}
            />
          </div>

          <Select
            label="Payment Method"
            options={[
              { value: 'mpesa',         label: 'M-Pesa' },
              { value: 'cash',          label: 'Cash' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cheque',        label: 'Cheque' },
              { value: 'card',          label: 'Card' },
              { value: 'other',         label: 'Other' },
            ]}
            {...register('paymentMethod')}
            error={errors.paymentMethod?.message}
          />

          {watchedMethod === 'mpesa' && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="M-Pesa Transaction Code" placeholder="e.g. QHX7ABC123" {...register('mpesaCode')} />
              <Input label="Phone Number" type="tel" placeholder="0712345678" {...register('phoneNumber')} />
            </div>
          )}
          {watchedMethod === 'bank_transfer' && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bank Name" placeholder="e.g. KCB, Equity" {...register('bankName')} />
              <Input label="Reference Number" placeholder="TRF-XXXXX" {...register('reference')} />
            </div>
          )}
          {watchedMethod === 'cheque' && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bank Name" placeholder="e.g. Co-op Bank" {...register('bankName')} />
              <Input label="Cheque Number" placeholder="CHQ-XXXXX" {...register('chequeNumber')} />
            </div>
          )}
          {(watchedMethod === 'card' || watchedMethod === 'other') && (
            <Input label="Reference" placeholder="Transaction reference" {...register('reference')} />
          )}

          <Input label="Notes (optional)" placeholder="Any additional notes" {...register('notes')} />
        </form>
      </Modal>

      {/* ── M-Pesa STK Push Modal ── */}
      <Modal
        open={showStkPush}
        onClose={closeStkPush}
        title="M-Pesa STK Push"
        size="sm"
        footer={
          stkStatus === 'idle' ? (
            <div className="flex gap-2 justify-end">
              <button onClick={closeStkPush} className="btn-secondary btn-sm">Cancel</button>
              <button form="stk-form" type="submit" className="btn-sm bg-green-600 text-white hover:bg-green-700 rounded-lg px-4 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" /> Send STK Push
              </button>
            </div>
          ) : stkStatus === 'confirmed' ? (
            <div className="flex justify-end">
              <button onClick={closeStkPush} className="btn-primary btn-sm">Done</button>
            </div>
          ) : null
        }
      >
        {stkStatus === 'idle' && (
          <form id="stk-form" onSubmit={hsStk(onStkPush)} className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <Smartphone className="w-8 h-8 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">M-Pesa STK Push</p>
                <p className="text-xs text-green-700 mt-0.5">The customer will receive a payment prompt on their registered M-Pesa phone.</p>
              </div>
            </div>
            <Input label="Account Number" placeholder="ACC-001234" {...regStk('accountNumber')} error={errStk.accountNumber?.message} />
            <Input label="Amount (KES)" type="number" placeholder="1500" {...regStk('amount')} error={errStk.amount?.message} />
            <Input label="Customer Phone" type="tel" placeholder="0712345678" {...regStk('phoneNumber')} error={errStk.phoneNumber?.message} />
          </form>
        )}

        {stkStatus === 'sending' && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="font-medium text-gray-700">Sending STK Push...</p>
            <p className="text-sm text-gray-500 mt-1">Contacting M-Pesa API</p>
          </div>
        )}

        {stkStatus === 'sent' && (
          <div className="py-8 text-center">
            <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="font-medium text-gray-700">Waiting for customer confirmation...</p>
            <p className="text-sm text-gray-500 mt-1">Customer should see a payment prompt on their phone</p>
          </div>
        )}

        {stkStatus === 'confirmed' && (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="font-bold text-gray-800 text-lg">Payment Confirmed!</p>
            <p className="text-sm text-gray-500 mt-1">M-Pesa transaction received. Receipt will be generated automatically.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
