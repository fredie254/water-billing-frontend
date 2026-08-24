import { useState, useEffect } from 'react';
import {
  Users, Zap, FileText, TrendingUp, AlertTriangle, Gauge, DollarSign, Activity, Droplets,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { reportsApi } from '@/features/reports/api/reports';
import { formatCurrency, formatNumber, formatDate } from '@/shared/utils/utils';
import { Badge } from '@/shared/components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats, DashboardRecentBill, RevenueDataPoint, ConsumptionDataPoint } from '@/types';

const ZONE_CONSUMPTION = [
  { zone: 'Zone A', units: 168400, connections: 480, color: '#0ea5e9' },
  { zone: 'Zone B', units: 142200, connections: 210, color: '#22c55e' },
  { zone: 'Zone C', units: 118600, connections: 85,  color: '#f59e0b' },
  { zone: 'Zone D', units: 71000,  connections: 422, color: '#8b5cf6' },
];

const OUTSTANDING_ACCOUNTS = [
  { name: 'David Mwangi',        account: 'ACC-001238', amount: 8900,   days: 47,  status: 'overdue' as const },
  { name: 'NBI Flowers Ltd',     account: 'ACC-001241', amount: 24500,  days: 32,  status: 'overdue' as const },
  { name: 'Bob Odhiambo',        account: 'ACC-001235', amount: 1990,   days: 18,  status: 'issued'  as const },
  { name: 'Peter Njoroge',       account: 'ACC-001239', amount: 3450,   days: 62,  status: 'overdue' as const },
  { name: 'Amina Hassan',        account: 'ACC-001240', amount: 2180,   days: 14,  status: 'issued'  as const },
];

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueDataPoint[]>([]);
  const [consumptionTrend, setConsumptionTrend] = useState<ConsumptionDataPoint[]>([]);
  const recentBills: DashboardRecentBill[] = stats?.recentBills ?? [];
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    reportsApi.getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));

    Promise.allSettled([
      reportsApi.getRevenueTrend({ months: 8 }),
      reportsApi.getConsumptionTrend({ months: 8 }),
    ])
      .then(([revenue, consumption]) => {
        if (revenue.status === 'fulfilled') setRevenueTrend(revenue.value);
        if (consumption.status === 'fulfilled') setConsumptionTrend(consumption.value);
      })
      .finally(() => setLoadingCharts(false));
  }, []);

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-water-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={formatNumber(stats?.totalCustomers ?? 0)}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          trend={{ value: 3.2, label: 'this month' }}
        />
        <StatCard
          title="Active Connections"
          value={formatNumber(stats?.activeConnections ?? 0)}
          icon={<Zap className="w-5 h-5" />}
          color="green"
          subtitle={`${stats?.overdueAccounts ?? 0} accounts overdue`}
        />
        <StatCard
          title="Total Revenue (Aug)"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="indigo"
          trend={{ value: 5.1, label: 'vs last month' }}
        />
        <StatCard
          title="Collection Rate"
          value={`${stats?.collectionRate ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          subtitle="Target: 90%"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Bills Issued"
          value={formatNumber(stats?.totalBillsIssued ?? 0)}
          icon={<FileText className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(stats?.outstandingBalance ?? 0)}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="yellow"
          subtitle="Across all accounts"
        />
        <StatCard
          title="Overdue Accounts"
          value={formatNumber(stats?.overdueAccounts ?? 0)}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Readings Due"
          value={formatNumber(stats?.readingsDueThisMonth ?? 0)}
          icon={<Gauge className="w-5 h-5" />}
          color="blue"
          subtitle="This month"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="card xl:col-span-2">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Revenue & Collections</h3>
              <p className="text-xs text-gray-500">Monthly billing vs actual collections</p>
            </div>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="p-6">
            {loadingCharts ? (
              <div className="flex items-center justify-center h-[260px]">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-water-600" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Billed" stroke="#0ea5e9" fill="url(#colorRevenue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#22c55e" fill="url(#colorCollected)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Consumption chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900">Water Consumption</h3>
            <p className="text-xs text-gray-500">Monthly m³ consumed</p>
          </div>
          <div className="p-6">
            {loadingCharts ? (
              <div className="flex items-center justify-center h-[260px]">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-water-600" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={consumptionTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`${formatNumber(v)} m³`, 'Units']} />
                  <Bar dataKey="units" name="m³" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Consumption by Zone + Outstanding Accounts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Zone consumption */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Consumption by Zone</h3>
              <p className="text-xs text-gray-500">This month — m³ per zone</p>
            </div>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="p-6 space-y-4">
            {ZONE_CONSUMPTION.map(z => {
              const maxUnits = Math.max(...ZONE_CONSUMPTION.map(d => d.units));
              const pct = (z.units / maxUnits) * 100;
              return (
                <div key={z.zone}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{z.zone}</span>
                    <span className="text-sm text-gray-500">{formatNumber(z.units)} m³</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: z.color }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-24 text-right">{z.connections} connections</span>
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-900">
                {formatNumber(ZONE_CONSUMPTION.reduce((s, z) => s + z.units, 0))} m³
              </span>
            </div>
          </div>
        </div>

        {/* Outstanding accounts */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Outstanding Accounts</h3>
              <p className="text-xs text-gray-500">Unpaid & overdue balances</p>
            </div>
            <button onClick={() => navigate('/arrears')} className="text-xs text-water-600 hover:text-water-700 font-medium">
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {OUTSTANDING_ACCOUNTS.map(a => (
              <div key={a.account} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.account} · {a.days} days</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${a.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {formatCurrency(a.amount)}
                  </p>
                  <Badge
                    label={a.status}
                    variant={a.status === 'overdue' ? 'red' : 'yellow'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bills */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Recent Bills</h3>
          <a href="/bills" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</a>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Customer</th>
                <th>Account</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="font-medium text-primary-600">{bill.billNumber}</td>
                  <td>{bill.customerName}</td>
                  <td className="text-xs font-mono text-gray-500">{bill.accountNumber}</td>
                  <td>{bill.billingPeriodStart ? new Date(bill.billingPeriodStart).toLocaleString('en-KE', { month: 'short', year: 'numeric' }) : '—'}</td>
                  <td className="font-medium">{formatCurrency(bill.totalAmount)}</td>
                  <td className={bill.amountPaid > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>{formatCurrency(bill.amountPaid)}</td>
                  <td><Badge label={bill.status} /></td>
                  <td>{formatDate(bill.dueDate)}</td>
                </tr>
              ))}
              {recentBills.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-gray-400 py-6">No recent bills</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
