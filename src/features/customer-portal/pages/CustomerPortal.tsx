import { useState, useEffect } from 'react';
import {
  Droplets, FileText, CreditCard, BarChart2, User, Home, Gauge,
  CheckCircle2, AlertCircle, Clock, TrendingUp,
  Phone, Mail, MapPin, Hash, Calendar, Wifi, WifiOff,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useAuthStore } from '@/core/auth/authStore';
import { portalApi } from '@/features/customer-portal/api/portal';
import { formatCurrency, formatDate, cn } from '@/shared/utils/utils';
import { Badge } from '@/shared/components/ui/Badge';

type Tab = 'overview' | 'bills' | 'payments' | 'consumption';

// ─── Portal API shape types ────────────────────────────────────────────────────

interface PortalOverview {
  customer?: {
    customerNo?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    customerType?: string;
    status?: string;
    outstandingBalance?: number;
  };
  connection?: {
    accountNumber?: string;
    status?: string;
    tariffName?: string;
  };
  meter?: {
    meterNumber?: string;
    serialNumber?: string;
    lastReading?: number;
    lastReadingDate?: string;
  };
  latestBill?: {
    billNumber?: string;
    totalAmount?: number;
    status?: string;
  };
  latestPayment?: {
    amount?: number;
    paidAt?: string;
    createdAt?: string;
  };
}

interface PortalBill {
  id: string;
  billNumber: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  unitsConsumed?: number;
  totalAmount: number;
  dueDate: string;
  status: string;
}

interface PortalPayment {
  id: string;
  paymentNumber?: string;
  receiptNumber?: string;
  paidAt?: string;
  createdAt?: string;
  amount: number;
  paymentMethod?: string;
  mpesaCode?: string;
  billNumber?: string;
}

interface ConsumptionPoint {
  month: string;
  units: number;
  amount?: number;
}

export const CustomerPortal = () => {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');

  // ─── API data ───────────────────────────────────────────────────────────────
  const [overview, setOverview]         = useState<PortalOverview | null>(null);
  const [bills, setBills]               = useState<PortalBill[]>([]);
  const [payments, setPayments]         = useState<PortalPayment[]>([]);
  const [consumption, setConsumption]   = useState<ConsumptionPoint[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingBills, setLoadingBills]       = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingConsumption, setLoadingConsumption] = useState(false);

  // Load overview + bills eagerly
  useEffect(() => {
    setLoadingOverview(true);
    portalApi.getOverview()
      .then((data: PortalOverview) => setOverview(data ?? null))
      .catch(() => {})
      .finally(() => setLoadingOverview(false));

    setLoadingBills(true);
    portalApi.getBills({ pageSize: 50 })
      .then((res: { data?: PortalBill[] }) => setBills(res?.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingBills(false));
  }, []);

  // Load payments when tab is opened
  useEffect(() => {
    if (tab !== 'payments') return;
    setLoadingPayments(true);
    portalApi.getPayments({ pageSize: 50 })
      .then((res: { data?: PortalPayment[] }) => setPayments(res?.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingPayments(false));
  }, [tab]);

  // Load consumption when tab is opened
  useEffect(() => {
    if (tab !== 'consumption') return;
    setLoadingConsumption(true);
    portalApi.getConsumption()
      .then((data: ConsumptionPoint[] | null) => setConsumption(data ?? []))
      .catch(() => {})
      .finally(() => setLoadingConsumption(false));
  }, [tab]);

  // ─── Derived values ─────────────────────────────────────────────────────────
  const customer     = overview?.customer;
  const connection   = overview?.connection;
  const meter        = overview?.meter;
  const latestBill   = overview?.latestBill ?? null;
  const latestPayment = overview?.latestPayment ?? null;
  const outstanding  = customer?.outstandingBalance ?? 0;

  const consumptionWithValues = consumption.filter(h => h.units > 0);
  const avgUnits = consumptionWithValues.length
    ? +(consumptionWithValues.reduce((s, h) => s + h.units, 0) / consumptionWithValues.length).toFixed(1)
    : 0;

  const totalPaidThisYear = payments.reduce((s, p) => s + p.amount, 0);
  const paidBillsCount = bills.filter(b => b.status === 'paid').length;
  const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',     label: 'Overview',      icon: <Home      className="w-4 h-4" /> },
    { id: 'bills',        label: 'My Bills',       icon: <FileText  className="w-4 h-4" /> },
    { id: 'payments',     label: 'My Payments',    icon: <CreditCard className="w-4 h-4" /> },
    { id: 'consumption',  label: 'Consumption',    icon: <BarChart2 className="w-4 h-4" /> },
  ];

  if (loadingOverview) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm p-6">
        Loading your account…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Account No: <span className="font-mono font-semibold text-primary-600">{connection?.accountNumber ?? '—'}</span>
            {customer && (
              <span className="ml-3 text-gray-400">Customer No: <span className="font-mono">{customer.customerNo}</span></span>
            )}
          </p>
        </div>

        {/* Pay Now CTA */}
        {outstanding > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Outstanding: {formatCurrency(outstanding)}</p>
              <p className="text-xs text-red-500">Pay via M-Pesa Paybill <strong>247247</strong>, Acc: {connection?.accountNumber}</p>
            </div>
          </div>
        )}
        {outstanding === 0 && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm font-semibold text-green-700">Account up to date</p>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════ OVERVIEW ══════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<AlertCircle className="w-5 h-5 text-red-500" />}
              bg="bg-red-50"
              label="Outstanding Balance"
              value={formatCurrency(outstanding)}
              sub={outstanding > 0 ? 'Payment overdue' : 'Fully paid'}
              valueClass={outstanding > 0 ? 'text-red-600' : 'text-green-600'}
            />
            <StatCard
              icon={<FileText className="w-5 h-5 text-blue-500" />}
              bg="bg-blue-50"
              label="Last Bill"
              value={latestBill ? formatCurrency(latestBill.totalAmount ?? 0) : '—'}
              sub={latestBill ? `${latestBill.billNumber} · ${latestBill.status}` : 'No bills yet'}
            />
            <StatCard
              icon={<CreditCard className="w-5 h-5 text-green-500" />}
              bg="bg-green-50"
              label="Last Payment"
              value={latestPayment ? formatCurrency(latestPayment.amount ?? 0) : '—'}
              sub={latestPayment ? formatDate(latestPayment.paidAt ?? latestPayment.createdAt ?? '') : 'No payments yet'}
            />
            <StatCard
              icon={<Droplets className="w-5 h-5 text-water-500" />}
              bg="bg-water-50"
              label="Avg Consumption"
              value={avgUnits ? `${avgUnits} m³` : '—'}
              sub="per month"
            />
          </div>

          {/* Account info + Meter info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Personal details */}
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>Account Details</span>
              </div>
              <div className="card-body space-y-3">
                <InfoRow icon={<Hash className="w-4 h-4" />}      label="Customer No"    value={customer?.customerNo ?? '—'} />
                <InfoRow icon={<User className="w-4 h-4" />}      label="Name"           value={customer?.name ?? user?.name ?? '—'} />
                <InfoRow icon={<Mail className="w-4 h-4" />}      label="Email"          value={customer?.email ?? user?.email ?? '—'} />
                <InfoRow icon={<Phone className="w-4 h-4" />}     label="Phone"          value={customer?.phone ?? '—'} />
                <InfoRow icon={<MapPin className="w-4 h-4" />}    label="Address"        value={customer?.address ?? '—'} />
                <InfoRow icon={<Droplets className="w-4 h-4" />}  label="Customer Type"  value={customer?.customerType ?? '—'} capitalize />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-gray-500">Account Status</span>
                  <Badge
                    label={customer?.status ?? 'active'}
                    variant={customer?.status === 'active' ? 'green' : customer?.status === 'suspended' ? 'red' : 'gray'}
                  />
                </div>
              </div>
            </div>

            {/* Connection & Meter */}
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <Gauge className="w-4 h-4 text-gray-500" />
                <span>Connection & Meter</span>
              </div>
              <div className="card-body space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Connection</span>
                  <div className="flex items-center gap-1.5">
                    {connection?.status === 'active'
                      ? <Wifi className="w-4 h-4 text-green-500" />
                      : <WifiOff className="w-4 h-4 text-red-500" />}
                    <Badge
                      label={connection?.status ?? 'unknown'}
                      variant={connection?.status === 'active' ? 'green' : 'red'}
                    />
                  </div>
                </div>
                <InfoRow icon={<Hash className="w-4 h-4" />}       label="Account No"     value={connection?.accountNumber ?? '—'} />
                <InfoRow icon={<Zap className="w-4 h-4" />}        label="Tariff"         value={connection?.tariffName ?? '—'} />
                <InfoRow icon={<Gauge className="w-4 h-4" />}      label="Meter No"       value={meter?.meterNumber ?? '—'} />
                <InfoRow icon={<Hash className="w-4 h-4" />}       label="Serial"         value={meter?.serialNumber ?? '—'} />
                <InfoRow icon={<TrendingUp className="w-4 h-4" />} label="Last Reading"   value={meter?.lastReading != null ? `${meter.lastReading} m³` : '—'} />
                <InfoRow icon={<Calendar className="w-4 h-4" />}   label="Last Read Date" value={meter?.lastReadingDate ? formatDate(meter.lastReadingDate) : '—'} />
              </div>
            </div>

            {/* Payment guide */}
            <div className="card border-water-200 bg-gradient-to-br from-water-50 to-white">
              <div className="card-header flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-water-600" />
                <span className="text-water-700">How to Pay</span>
              </div>
              <div className="card-body space-y-4">
                <div className="bg-water-600 text-white rounded-xl p-4 text-center space-y-1">
                  <p className="text-xs font-medium text-water-200">M-Pesa Paybill</p>
                  <p className="text-3xl font-bold tracking-widest">247247</p>
                  <p className="text-xs text-water-200">Business Number</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-water-100 space-y-1">
                  <p className="text-xs text-gray-500">Account Number</p>
                  <p className="text-lg font-bold font-mono text-gray-800">{connection?.accountNumber ?? 'ACC-001234'}</p>
                </div>
                <ol className="space-y-1.5 text-xs text-gray-600">
                  <li className="flex gap-2"><span className="font-bold text-water-600">1.</span> Go to M-Pesa → Lipa na M-Pesa</li>
                  <li className="flex gap-2"><span className="font-bold text-water-600">2.</span> Select Paybill → Enter <strong>247247</strong></li>
                  <li className="flex gap-2"><span className="font-bold text-water-600">3.</span> Account No: <strong>{connection?.accountNumber ?? 'ACC-001234'}</strong></li>
                  <li className="flex gap-2"><span className="font-bold text-water-600">4.</span> Enter amount and confirm with PIN</li>
                </ol>
                <p className="text-xs text-gray-400 text-center">Receipt is sent to your phone automatically</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ MY BILLS ══════════════════════ */}
      {tab === 'bills' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={<FileText className="w-5 h-5 text-blue-500" />}  bg="bg-blue-50"  label="Total Bills" value={`${bills.length}`}      sub="fetched" />
            <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} bg="bg-green-50" label="Paid"        value={`${paidBillsCount}`}  sub="fully settled" />
            <StatCard icon={<AlertCircle className="w-5 h-5 text-red-500" />} bg="bg-red-50"   label="Outstanding"  value={formatCurrency(outstanding)}  sub={outstanding > 0 ? 'due now' : 'all clear'} valueClass={outstanding > 0 ? 'text-red-600' : 'text-green-600'} />
          </div>

          {/* Bills table */}
          <div className="card">
            <div className="card-header">Bill History</div>
            <div className="card-body p-0">
              {loadingBills ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading bills…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bill No</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Units (m³)</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bills.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No bills found.</td></tr>
                      )}
                      {bills.map(bill => (
                        <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-primary-600 font-medium">{bill.billNumber}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {bill.billingPeriodStart ? formatDate(bill.billingPeriodStart) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{bill.unitsConsumed ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(bill.totalAmount)}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(bill.dueDate)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge label={bill.status} variant={bill.status === 'paid' ? 'green' : 'red'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">Total Billed</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {formatCurrency(totalBilled)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ MY PAYMENTS ═══════════════════ */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={<CreditCard className="w-5 h-5 text-green-500" />} bg="bg-green-50" label="Total Paid" value={formatCurrency(totalPaidThisYear)} sub={`${payments.length} transactions`} />
            <StatCard icon={<TrendingUp className="w-5 h-5 text-blue-500" />}  bg="bg-blue-50"  label="Last Payment"     value={payments[0] ? formatCurrency(payments[0].amount) : '—'} sub={payments[0] ? formatDate(payments[0].paidAt ?? payments[0].createdAt ?? '') : '—'} />
            <StatCard icon={<CheckCircle2 className="w-5 h-5 text-water-500" />} bg="bg-water-50" label="Outstanding"    value={formatCurrency(outstanding)} sub={outstanding === 0 ? 'fully settled' : 'due now'} valueClass={outstanding > 0 ? 'text-red-600' : 'text-green-600'} />
          </div>

          <div className="card">
            <div className="card-header">Payment History</div>
            <div className="card-body p-0">
              {loadingPayments ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading payments…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Receipt No</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">M-Pesa Code</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bill Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payments.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No payments found.</td></tr>
                      )}
                      {payments.map(pmt => (
                        <tr key={pmt.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-primary-600 font-medium">{pmt.receiptNumber ?? pmt.paymentNumber ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{formatDate(pmt.paidAt ?? pmt.createdAt ?? '')}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(pmt.amount)}</td>
                          <td className="px-4 py-3">
                            <Badge label={pmt.paymentMethod ?? '—'} variant={pmt.paymentMethod === 'mpesa' ? 'green' : 'blue'} />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{pmt.mpesaCode || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{pmt.billNumber || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-600">Total Paid</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(totalPayments)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ CONSUMPTION ═══════════════════ */}
      {tab === 'consumption' && (
        <div className="space-y-4">
          {loadingConsumption ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading consumption data…</div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<TrendingUp className="w-5 h-5 text-water-500" />}  bg="bg-water-50"  label="Monthly Average"  value={avgUnits ? `${avgUnits} m³` : '—'} sub="based on history" />
                <StatCard
                  icon={<Droplets className="w-5 h-5 text-blue-500" />}
                  bg="bg-blue-50"
                  label="Latest Month"
                  value={consumption.length ? `${consumption[consumption.length - 1]?.units ?? 0} m³` : '—'}
                  sub={consumption.length ? consumption[consumption.length - 1]?.month : ''}
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
                  bg="bg-orange-50"
                  label="Highest Month"
                  value={consumption.length ? `${Math.max(...consumption.map(h => h.units))} m³` : '—'}
                  sub="peak usage"
                />
                <StatCard icon={<Clock className="w-5 h-5 text-gray-400" />} bg="bg-gray-50" label="Data Points" value={`${consumption.length}`} sub="months recorded" valueClass="text-gray-700" />
              </div>

              {/* Bar chart */}
              {consumption.length > 0 && (
                <div className="card">
                  <div className="card-header">Monthly Consumption (m³)</div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={consumption} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} unit=" m³" width={56} />
                        <Tooltip
                          formatter={(v: number) => [`${v} m³`, 'Consumption']}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                        {avgUnits > 0 && (
                          <ReferenceLine y={avgUnits} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: `Avg ${avgUnits}`, fontSize: 11, fill: '#94a3b8' }} />
                        )}
                        <Bar dataKey="units" fill="#0ea5e9" radius={[4, 4, 0, 0]}
                          label={{ position: 'top', fontSize: 10, fill: '#64748b', formatter: (v: number) => v > 0 ? v : '' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Small reusable components ─────────────────────────────────────────────────

function StatCard({
  icon, bg, label, value, sub, valueClass,
}: {
  icon: React.ReactNode; bg: string; label: string;
  value: string; sub?: string; valueClass?: string;
}) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-start justify-between gap-2">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-xs text-gray-500 truncate">{label}</p>
            <p className={cn('text-xl font-bold text-gray-900 leading-tight', valueClass)}>{value}</p>
            {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon, label, value, capitalize,
}: {
  icon: React.ReactNode; label: string; value: string; capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={cn('text-sm font-medium text-gray-800 truncate', capitalize && 'capitalize')}>{value}</p>
      </div>
    </div>
  );
}

// Local alias so we can use the Zap icon without importing from lucide in this file
function Zap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
