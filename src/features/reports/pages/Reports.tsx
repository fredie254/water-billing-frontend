import { useState, useEffect, useMemo } from 'react';
import {
  Download, TrendingUp, TrendingDown, BarChart2, DollarSign, Droplets, FileText, Gauge,
  AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { downloadExcel } from '@/shared/utils/printUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { reportsApi } from '@/features/reports/api/reports';
import { billsApi } from '@/features/billing/api/billing';
import { metersApi } from '@/features/meters/api/meters';
import type { Bill, Meter } from '@/types';
import { formatCurrency, formatNumber, formatDate } from '@/shared/utils/utils';
import { Badge } from '@/shared/components/ui/Badge';
import type { RevenueDataPoint, ConsumptionDataPoint, DashboardStats } from '@/types';

type Tab = 'revenue' | 'consumption' | 'billing' | 'metering';

// ─── Static aggregated data ────────────────────────────────────────────────────
const ZONE_REVENUE = [
  { zone: 'Zone A – Residential', billed: 3_840_000, collected: 3_420_000, outstanding: 420_000, connections: 480 },
  { zone: 'Zone B – Commercial',  billed: 3_120_000, collected: 2_780_000, outstanding: 340_000, connections: 210 },
  { zone: 'Zone C – Industrial',  billed: 1_980_000, collected: 1_650_000, outstanding: 330_000, connections: 85  },
  { zone: 'Zone D – Peri-Urban',  billed: 902_600,   collected: 750_000,   outstanding: 152_600, connections: 422 },
];

const CUSTOMER_TYPE_REVENUE = [
  { type: 'Residential',  billed: 4_210_000, collected: 3_740_000, count: 820 },
  { type: 'Commercial',   billed: 2_980_000, collected: 2_650_000, count: 198 },
  { type: 'Industrial',   billed: 1_540_000, collected: 1_280_000, count: 42  },
  { type: 'Government',   billed: 680_000,   collected: 640_000,   count: 18  },
  { type: 'Institutional',billed: 432_600,   collected: 390_000,   count: 22  },
];

const ZONE_CONSUMPTION = [
  { zone: 'Zone A', units: 168_400, avgPerCustomer: 351, connections: 480 },
  { zone: 'Zone B', units: 142_200, avgPerCustomer: 677, connections: 210 },
  { zone: 'Zone C', units: 118_600, avgPerCustomer: 1395, connections: 85  },
  { zone: 'Zone D', units: 71_000,  avgPerCustomer: 168, connections: 422 },
];

const HIGH_CONSUMERS = [
  { name: 'NBI Flowers Ltd',      account: 'ACC-001241', zone: 'Zone C', units: 4_280, amount: 185_000 },
  { name: 'Sunflower Estates Ltd',account: 'ACC-001237', zone: 'Zone B', units: 3_421, amount: 142_600 },
  { name: 'Nairobi County Govt',  account: 'ACC-001242', zone: 'Zone B', units: 2_850, amount: 118_400 },
  { name: 'St. Mary\'s Hospital', account: 'ACC-001245', zone: 'Zone A', units: 1_920, amount: 78_500 },
  { name: 'ABC Industries',       account: 'ACC-001248', zone: 'Zone C', units: 1_640, amount: 66_200 },
];

const AGING_DATA = [
  { label: 'Current (0 days)', amount: 620_000, count: 68  },
  { label: '1–30 days',        amount: 420_000, count: 48  },
  { label: '31–60 days',       amount: 185_000, count: 22  },
  { label: '61–90 days',       amount: 94_000,  count: 11  },
  { label: '90+ days',         amount: 62_000,  count: 8   },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export const Reports = () => {
  const [tab, setTab] = useState<Tab>('revenue');
  const [period, setPeriod] = useState('8');

  const [revenueTrend, setRevenueTrend] = useState<RevenueDataPoint[]>([]);
  const [consumptionTrend, setConsumptionTrend] = useState<ConsumptionDataPoint[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billsFetched, setBillsFetched] = useState(false);

  const [meters, setMeters] = useState<Meter[]>([]);
  const [loadingMetering, setLoadingMetering] = useState(false);
  const [metersFetched, setMetersFetched] = useState(false);

  // Fetch dashboard stats once on mount; backend /reports/dashboard may return 500
  useEffect(() => {
    reportsApi.getDashboardStats()
      .then(setDashboardStats)
      .catch(() => setStatsError(true))
      .finally(() => setLoadingStats(false));
  }, []);

  // Lazy-fetch bills when billing tab is opened
  useEffect(() => {
    if (tab !== 'billing' || billsFetched) return;
    setLoadingBilling(true);
    billsApi.list({ pageSize: 100 })
      .then(res => setBills(res.data ?? []))
      .catch(console.error)
      .finally(() => { setLoadingBilling(false); setBillsFetched(true); });
  }, [tab, billsFetched]);

  // Lazy-fetch meters when metering tab is opened
  useEffect(() => {
    if (tab !== 'metering' || metersFetched) return;
    setLoadingMetering(true);
    metersApi.list({ pageSize: 100 })
      .then(res => setMeters(res.data ?? []))
      .catch(console.error)
      .finally(() => { setLoadingMetering(false); setMetersFetched(true); });
  }, [tab, metersFetched]);

  // Re-fetch trend data whenever the period filter changes
  useEffect(() => {
    setLoadingTrends(true);
    Promise.allSettled([
      reportsApi.getRevenueTrend({ months: Number(period) }),
      reportsApi.getConsumptionTrend({ months: Number(period) }),
    ])
      .then(([revenue, consumption]) => {
        if (revenue.status === 'fulfilled') setRevenueTrend(revenue.value);
        if (consumption.status === 'fulfilled') setConsumptionTrend(consumption.value);
      })
      .finally(() => setLoadingTrends(false));
  }, [period]);

  const trend = revenueTrend.slice(-Number(period));
  const consumption = consumptionTrend.slice(-Number(period));

  const meterStats = useMemo(() => ({
    total:   meters.length,
    active:  meters.filter(m => m.status === 'active').length,
    faulty:  meters.filter(m => m.status === 'faulty').length,
    pending: meters.filter(m => m.status === 'inactive').length,
    removed: meters.filter(m => m.status === 'removed').length,
    estimated: 0,
    tampered:  0,
    read:      0,
  }), [meters]);

  const billStatusPie = useMemo(() => [
    { name: 'Paid',      value: bills.filter(b => b.status === 'paid').length,      color: '#22c55e' },
    { name: 'Issued',    value: bills.filter(b => b.status === 'issued').length,    color: '#3b82f6' },
    { name: 'Partial',   value: bills.filter(b => b.status === 'partial').length,   color: '#f59e0b' },
    { name: 'Overdue',   value: bills.filter(b => b.status === 'overdue').length,   color: '#ef4444' },
    { name: 'Cancelled', value: bills.filter(b => b.status === 'cancelled').length, color: '#9ca3af' },
  ], [bills]);

  const totalBilled      = revenueTrend.reduce((s, d) => s + d.revenue, 0);
  const totalCollected   = revenueTrend.reduce((s, d) => s + d.collected, 0);
  const totalOutstanding = revenueTrend.reduce((s, d) => s + d.outstanding, 0);
  const collectionEff    = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0.0';
  const totalConsumption = consumptionTrend.reduce((s, d) => s + d.units, 0);
  // Fall back to locally-computed value when dashboard API fails
  const activeConnections = dashboardStats?.activeConnections ?? Math.max(consumptionTrend[0]?.connections ?? 1, 1);
  const avgConsumption   = consumptionTrend.length > 0
    ? (totalConsumption / consumptionTrend.length / activeConnections).toFixed(1)
    : '0.0';
  const peakConsumption  = consumptionTrend.length > 0
    ? Math.max(...consumptionTrend.map(d => d.units))
    : 0;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'revenue',     label: 'Revenue',     icon: <DollarSign className="w-4 h-4" /> },
    { key: 'consumption', label: 'Consumption', icon: <Droplets   className="w-4 h-4" /> },
    { key: 'billing',     label: 'Billing',     icon: <FileText   className="w-4 h-4" /> },
    { key: 'metering',    label: 'Metering',    icon: <Gauge      className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Financial and operational performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input-base text-sm w-auto"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="8">Last 8 months</option>
          </select>
          <button
            onClick={() => {
              if (tab === 'revenue')
                downloadExcel(trend as unknown as Record<string, unknown>[], 'revenue-trend');
              else if (tab === 'consumption')
                downloadExcel(consumption as unknown as Record<string, unknown>[], 'consumption-trend');
              else if (tab === 'billing')
                downloadExcel(
                  bills.map(b => ({ bill: b.billNumber, customer: b.customerName, amount: b.totalAmount, status: b.status, due: b.dueDate })),
                  'bills-report',
                );
              else if (tab === 'metering')
                downloadExcel(
                  meters.map(m => ({ meter: m.meterNumber, customer: m.customerName ?? '', type: m.type, status: m.status, lastRead: m.lastReadingDate ?? '' })),
                  'meters-report',
                );
            }}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-water-500 text-water-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Backend stats unavailable notice */}
      {statsError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            The <strong>/reports/dashboard</strong> endpoint returned a server error (500). Summary stats are
            computed from local data — charts and trends are unaffected. Please check the backend logs to resolve
            the upstream issue.
          </span>
        </div>
      )}

      {/* ── Revenue Tab ──────────────────────────────────────────────────────────── */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Billed',     value: formatCurrency(totalBilled),     icon: <FileText className="w-5 h-5 text-blue-600" />,    bg: 'bg-blue-50'   },
              { label: 'Total Collected',  value: formatCurrency(totalCollected),  icon: <TrendingUp className="w-5 h-5 text-green-600" />,  bg: 'bg-green-50'  },
              { label: 'Outstanding',      value: formatCurrency(totalOutstanding),icon: <TrendingDown className="w-5 h-5 text-red-600" />,  bg: 'bg-red-50'    },
              { label: 'Collection Rate',  value: `${collectionEff}%`,             icon: <BarChart2 className="w-5 h-5 text-purple-600" />,  bg: 'bg-purple-50' },
            ].map(c => (
              <div key={c.label} className="card p-4 flex items-center gap-4">
                <div className={`${c.bg} p-3 rounded-xl`}>{c.icon}</div>
                <div>
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className="text-lg font-bold text-gray-900">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue vs Collections trend */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Revenue vs Collections Trend</h3>
              <button
                onClick={() => downloadExcel(trend as unknown as Record<string, unknown>[], 'revenue-collections-trend')}
                className="btn-secondary btn-sm flex items-center gap-1"
              ><Download className="w-3.5 h-3.5" /> CSV</button>
            </div>
            <div className="p-6">
              {loadingTrends ? (
                <div className="flex items-center justify-center h-[280px]">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-water-600" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue"     name="Billed"      stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="collected"   name="Collected"   stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="outstanding" name="Outstanding" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Revenue by Zone */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Revenue by Zone</h3>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ZONE_REVENUE} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="zone" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
                  <Legend />
                  <Bar dataKey="billed"    name="Billed"    fill="#0ea5e9" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Customer Type */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Revenue by Customer Type</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={CUSTOMER_TYPE_REVENUE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
                    <Legend />
                    <Bar dataKey="billed"    name="Billed"    fill="#818cf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Aging */}
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Debt Aging Analysis</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Age Band</th><th>Accounts</th><th>Outstanding</th><th>Share</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {AGING_DATA.map(row => {
                      const total = AGING_DATA.reduce((s, r) => s + r.amount, 0);
                      const pct = (row.amount / total * 100).toFixed(0);
                      return (
                        <tr key={row.label}>
                          <td className="font-medium text-sm">{row.label}</td>
                          <td className="text-sm">{row.count}</td>
                          <td className="font-medium text-red-600 text-sm">{formatCurrency(row.amount)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Consumption Tab ───────────────────────────────────────────────────────── */}
      {tab === 'consumption' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Consumption', value: `${formatNumber(totalConsumption)} m³`, icon: <Droplets className="w-5 h-5 text-blue-600" />,   bg: 'bg-blue-50'   },
              { label: 'Active Connections', value: loadingStats ? '…' : formatNumber(dashboardStats?.activeConnections ?? 0), icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bg: 'bg-green-50' },
              { label: 'Avg Monthly / Conn', value: `${avgConsumption} m³`, icon: <BarChart2 className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
              { label: 'Peak Month (m³)',    value: `${formatNumber(peakConsumption)} m³`, icon: <TrendingUp className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
            ].map(c => (
              <div key={c.label} className="card p-4 flex items-center gap-4">
                <div className={`${c.bg} p-3 rounded-xl`}>{c.icon}</div>
                <div>
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className="text-lg font-bold text-gray-900">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly consumption trend */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Monthly Consumption Trend (m³)</h3>
            </div>
            <div className="p-6">
              {loadingTrends ? (
                <div className="flex items-center justify-center h-[260px]">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-water-600" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={consumption}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`${formatNumber(v)} m³`, 'Consumed']} />
                    <Bar dataKey="units" name="m³" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Consumption by Zone */}
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Consumption by Zone (m³)</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ZONE_CONSUMPTION}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`${formatNumber(v)} m³`, '']} />
                    <Bar dataKey="units" name="Total m³" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgPerCustomer" name="Avg/Connection" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* High consumption customers */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Top Consumers</h3>
                <Badge label="High Usage" variant="red" />
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>#</th><th>Customer</th><th>Zone</th><th>m³</th><th>Amount</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {HIGH_CONSUMERS.map((c, i) => (
                      <tr key={c.account} className="hover:bg-gray-50">
                        <td className="text-sm text-gray-400">{i + 1}</td>
                        <td>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.account}</p>
                        </td>
                        <td className="text-sm text-gray-600">{c.zone}</td>
                        <td className="text-sm font-semibold text-blue-700">{formatNumber(c.units)}</td>
                        <td className="text-sm font-medium">{formatCurrency(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing Tab ───────────────────────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {loadingBilling ? (
              <div className="col-span-5 flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-water-600" />
              </div>
            ) : null}
          {!loadingBilling && ([
              ['Generated',  bills.length,                                                                    'text-blue-600',  'bg-blue-50'   ],
              ['Paid',       bills.filter(b => b.status === 'paid').length,                                   'text-green-600', 'bg-green-50'  ],
              ['Unpaid',     bills.filter(b => b.status === 'issued' || b.status === 'partial').length,       'text-yellow-600','bg-yellow-50'],
              ['Overdue',    bills.filter(b => b.status === 'overdue').length,                                'text-red-600',   'bg-red-50'    ],
              ['Cancelled',  bills.filter(b => b.status === 'cancelled').length,                              'text-gray-500',  'bg-gray-50'   ],
            ] as [string, number, string, string][]).map(([label, val, color]) => (
              <div key={label} className="card p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-gray-400 mt-0.5">bills</p>
              </div>
            ))}
          </div>

          {/* Bill status distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Bill Status Distribution</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={billStatusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                      {billStatusPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: number) => [`${v} bills`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bills table */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Bills</h3>
                <button
                  onClick={() => downloadExcel(
                    bills.map(b => ({ bill: b.billNumber, customer: b.customerName, amount: b.totalAmount, status: b.status, due: b.dueDate })),
                    'bills-report',
                  )}
                  className="btn-secondary btn-sm flex items-center gap-1"
                ><Download className="w-3.5 h-3.5" /> CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Bill #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {bills.slice(0, 6).map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="font-mono text-xs text-blue-600">{b.billNumber}</td>
                        <td className="text-sm font-medium">{b.customerName}</td>
                        <td className="text-sm">{formatCurrency(b.totalAmount)}</td>
                        <td><Badge
                          label={b.status}
                          variant={b.status === 'paid' ? 'green' : b.status === 'overdue' ? 'red' : b.status === 'partial' ? 'yellow' : b.status === 'cancelled' ? 'gray' : 'blue'}
                        /></td>
                        <td className="text-xs text-gray-500">{formatDate(b.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Billing summary stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Billing Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Metric</th><th>Bills</th><th>Total Amount</th><th>Avg per Bill</th><th>% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billStatusPie.filter(r => r.value > 0).map(row => {
                    const billsForStatus = bills.filter(b => b.status === row.name.toLowerCase());
                    const total = billsForStatus.reduce((s, b) => s + b.totalAmount, 0);
                    const grandTotal = bills.reduce((s, b) => s + b.totalAmount, 0);
                    return (
                      <tr key={row.name}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: row.color }} />
                            <span className="font-medium text-sm">{row.name}</span>
                          </div>
                        </td>
                        <td className="text-sm">{row.value}</td>
                        <td className="text-sm font-medium">{formatCurrency(total)}</td>
                        <td className="text-sm text-gray-500">{row.value > 0 ? formatCurrency(total / row.value) : '—'}</td>
                        <td className="text-sm text-gray-500">{grandTotal > 0 ? `${(total / grandTotal * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Metering Tab ──────────────────────────────────────────────────────────── */}
      {tab === 'metering' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Meters',    value: String(meterStats.total),    icon: <Gauge className="w-5 h-5 text-blue-600" />,       bg: 'bg-blue-50'   },
              { label: 'Active',          value: String(meterStats.active),   icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,bg: 'bg-green-50'  },
              { label: 'Faulty',          value: String(meterStats.faulty),   icon: <AlertTriangle className="w-5 h-5 text-red-600" />, bg: 'bg-red-50'    },
              { label: 'Pending Install', value: String(meterStats.pending),  icon: <Clock className="w-5 h-5 text-yellow-600" />,     bg: 'bg-yellow-50' },
            ].map(c => (
              <div key={c.label} className="card p-4 flex items-center gap-4">
                <div className={`${c.bg} p-3 rounded-xl`}>{c.icon}</div>
                <div>
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Readings Validated', value: String(meterStats.read),      color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Estimated Reads',    value: String(meterStats.estimated), color: 'text-yellow-700',bg: 'bg-yellow-50'},
              { label: 'Flagged Reads',      value: String(meterStats.tampered),  color: 'text-red-700',   bg: 'bg-red-50'   },
              { label: 'Meters Removed',     value: String(meterStats.removed),   color: 'text-gray-700',  bg: 'bg-gray-50'  },
            ].map(c => (
              <div key={c.label} className={`rounded-xl border border-gray-200 p-4 ${c.bg}`}>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Meter readings by type & status breakdown */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Meter Status Breakdown</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active',        value: meterStats.active,  fill: '#22c55e' },
                        { name: 'Faulty',        value: meterStats.faulty,  fill: '#ef4444' },
                        { name: 'Pending',       value: meterStats.pending, fill: '#f59e0b' },
                        { name: 'Removed',       value: meterStats.removed, fill: '#9ca3af' },
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}
                    >
                      {[
                        { name: 'Active', fill: '#22c55e' },
                        { name: 'Faulty', fill: '#ef4444' },
                        { name: 'Pending', fill: '#f59e0b' },
                        { name: 'Removed', fill: '#9ca3af' },
                      ].map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: number) => [`${v} meters`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Meter details table */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Meter Details</h3>
                <button
                  onClick={() => downloadExcel(
                    meters.map(m => ({ meter: m.meterNumber, customer: m.customerName ?? '', type: m.type, status: m.status, lastRead: m.lastReadingDate ?? '' })),
                    'meters-report',
                  )}
                  className="btn-secondary btn-sm flex items-center gap-1"
                ><Download className="w-3.5 h-3.5" /> CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Meter No.</th><th>Customer</th><th>Type</th><th>Status</th><th>Last Read</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingMetering ? (
                      <tr><td colSpan={5} className="text-center py-6">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-water-600 mx-auto" />
                      </td></tr>
                    ) : meters.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="font-mono text-xs">{m.meterNumber}</td>
                        <td className="text-sm">{m.customerName ?? '—'}</td>
                        <td className="text-xs text-gray-500 capitalize">{m.type.replace('_', ' ')}</td>
                        <td>
                          <Badge
                            label={m.status}
                            variant={m.status === 'active' ? 'green' : m.status === 'faulty' ? 'red' : m.status === 'removed' ? 'gray' : 'yellow'}
                          />
                        </td>
                        <td className="text-xs text-gray-500">{m.lastReadingDate ? formatDate(m.lastReadingDate) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
