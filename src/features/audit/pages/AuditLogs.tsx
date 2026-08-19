import { useState, useEffect, useCallback } from 'react';
import {
  Search, LogIn, LogOut, AlertTriangle, UserCog, Users, Zap, Gauge,
  Activity, FileText, CreditCard, Route, Settings, Key,
} from 'lucide-react';
import { format } from 'date-fns';
import { auditLogsApi } from '@/features/audit/api/auditLogs';
import { usersApi } from '@/features/users/api/users';
import type { AuditLog, AuditAction, User } from '@/types';
import { cn } from '@/shared/utils/utils';

interface ActionMeta { label: string; color: string; icon: React.ReactNode }

const ACTION_META: Record<AuditAction, ActionMeta> = {
  login:                { label: 'Login',               color: 'badge-blue',   icon: <LogIn   className="w-3 h-3" /> },
  logout:               { label: 'Logout',              color: 'badge-gray',   icon: <LogOut  className="w-3 h-3" /> },
  login_failed:         { label: 'Login Failed',        color: 'badge-red',    icon: <AlertTriangle className="w-3 h-3" /> },
  user_created:         { label: 'User Created',        color: 'badge-purple', icon: <Users   className="w-3 h-3" /> },
  user_updated:         { label: 'User Updated',        color: 'badge-purple', icon: <UserCog className="w-3 h-3" /> },
  user_activated:       { label: 'User Activated',      color: 'badge-green',  icon: <Users   className="w-3 h-3" /> },
  user_deactivated:     { label: 'User Deactivated',    color: 'badge-red',    icon: <Users   className="w-3 h-3" /> },
  user_deleted:         { label: 'User Deleted',        color: 'badge-red',    icon: <Users   className="w-3 h-3" /> },
  customer_created:     { label: 'Customer Created',    color: 'badge-blue',   icon: <Users   className="w-3 h-3" /> },
  customer_updated:     { label: 'Customer Updated',    color: 'badge-blue',   icon: <UserCog className="w-3 h-3" /> },
  customer_deleted:     { label: 'Customer Deleted',    color: 'badge-red',    icon: <Users   className="w-3 h-3" /> },
  connection_created:   { label: 'Connection Created',  color: 'badge-green',  icon: <Zap     className="w-3 h-3" /> },
  connection_updated:   { label: 'Connection Updated',  color: 'badge-green',  icon: <Zap     className="w-3 h-3" /> },
  connection_suspended: { label: 'Suspended',           color: 'badge-red',    icon: <Zap     className="w-3 h-3" /> },
  connection_activated: { label: 'Conn. Activated',     color: 'badge-green',  icon: <Zap     className="w-3 h-3" /> },
  meter_created:        { label: 'Meter Created',       color: 'badge-yellow', icon: <Gauge   className="w-3 h-3" /> },
  meter_updated:        { label: 'Meter Updated',       color: 'badge-yellow', icon: <Gauge   className="w-3 h-3" /> },
  reading_recorded:     { label: 'Reading Recorded',    color: 'badge-yellow', icon: <Activity className="w-3 h-3" /> },
  bill_generated:       { label: 'Bill Generated',      color: 'badge-blue',   icon: <FileText className="w-3 h-3" /> },
  bill_cancelled:       { label: 'Bill Cancelled',      color: 'badge-red',    icon: <FileText className="w-3 h-3" /> },
  payment_recorded:     { label: 'Payment Recorded',    color: 'badge-green',  icon: <CreditCard className="w-3 h-3" /> },
  payment_reversed:     { label: 'Payment Reversed',    color: 'badge-red',    icon: <CreditCard className="w-3 h-3" /> },
  tariff_created:       { label: 'Tariff Created',      color: 'badge-purple', icon: <Route   className="w-3 h-3" /> },
  tariff_updated:       { label: 'Tariff Updated',      color: 'badge-purple', icon: <Route   className="w-3 h-3" /> },
  settings_updated:     { label: 'Settings Updated',    color: 'badge-gray',   icon: <Settings className="w-3 h-3" /> },
  password_changed:     { label: 'Password Changed',    color: 'badge-yellow', icon: <Key     className="w-3 h-3" /> },
};

const ACTION_GROUPS = [
  { label: 'Auth Events',      values: ['login', 'logout', 'login_failed', 'password_changed'] },
  { label: 'User Management',  values: ['user_created', 'user_updated', 'user_activated', 'user_deactivated', 'user_deleted'] },
  { label: 'Customers',        values: ['customer_created', 'customer_updated', 'customer_deleted'] },
  { label: 'Connections',      values: ['connection_created', 'connection_updated', 'connection_suspended', 'connection_activated'] },
  { label: 'Meters & Readings',values: ['meter_created', 'meter_updated', 'reading_recorded'] },
  { label: 'Billing',          values: ['bill_generated', 'bill_cancelled', 'payment_recorded', 'payment_reversed', 'tariff_created', 'tariff_updated'] },
  { label: 'System',           values: ['settings_updated'] },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', tenant_admin: 'Admin', manager: 'Manager',
  billing_officer: 'Billing Officer', meter_reader: 'Meter Reader',
  customer_service: 'Customer Service', customer: 'Customer',
};

const PAGE_SIZE = 15;

const fmtDate = (iso: string) => {
  try { return format(new Date(iso), 'dd MMM yyyy, HH:mm:ss'); } catch { return iso; }
};

export const AuditLogs = () => {
  const [search, setSearch]           = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter]   = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [page, setPage]               = useState(1);

  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);

  // For the user filter dropdown
  const [systemUsers, setSystemUsers] = useState<User[]>([]);

  // ── Stats (derived from a separate "all" fetch or from current page) ──
  const [todayCount, setTodayCount] = useState(0);
  const [authCount, setAuthCount]   = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  // Fetch users for dropdown once
  useEffect(() => {
    usersApi.list({ limit: 200 })
      .then(r => setSystemUsers(r.data ?? []))
      .catch(() => {});
  }, []);

  // Fetch stats once (no filters, large limit for a count pass)
  useEffect(() => {
    auditLogsApi.list({ limit: 1000, sortBy: 'createdAt', sortOrder: 'desc' })
      .then(r => {
        const all: AuditLog[] = r.data ?? [];
        const today = new Date().toISOString().slice(0, 10);
        setTodayCount(all.filter(l => l.createdAt.startsWith(today)).length);
        setAuthCount(all.filter(l => ['login', 'logout', 'login_failed'].includes(l.action)).length);
        setAlertCount(all.filter(l => ['login_failed', 'user_deactivated', 'connection_suspended', 'payment_reversed', 'bill_cancelled'].includes(l.action)).length);
      })
      .catch(() => {});
  }, []);

  // Fetch filtered + paginated logs
  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = {
      page,
      limit: PAGE_SIZE,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    if (search)       params.search = search;
    if (actionFilter) params.action = actionFilter;
    if (userFilter)   params.userId = userFilter;
    if (dateFrom)     params.dateFrom = dateFrom;
    if (dateTo)       params.dateTo = dateTo + 'T23:59:59';

    auditLogsApi.list(params)
      .then(r => { setLogs(r.data ?? []); setTotal(r.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, actionFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearFilters = () => {
    setSearch(''); setActionFilter(''); setUserFilter('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };
  const hasFilters = !!(search || actionFilter || userFilter || dateFrom || dateTo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete trail of all system actions and events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today's Events", value: todayCount, color: 'text-primary-700', bg: 'bg-primary-50' },
          { label: 'Auth Events',    value: authCount,  color: 'text-blue-700',    bg: 'bg-blue-50' },
          { label: 'Alerts',         value: alertCount, color: 'text-red-700',     bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4', s.bg)}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search description, user, resource, IP…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-base pl-9 w-full"
            />
          </div>
          <select
            value={userFilter}
            onChange={e => { setUserFilter(e.target.value); setPage(1); }}
            className="input-base sm:w-48"
          >
            <option value="">All Users</option>
            {systemUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="input-base flex-1"
          >
            <option value="">All Actions</option>
            {ACTION_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.values.map(v => (
                  <option key={v} value={v}>
                    {ACTION_META[v as AuditAction]?.label ?? v}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="input-base w-40"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="input-base w-40"
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost btn-sm whitespace-nowrap">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Resource</th>
                <th>Description</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Loading audit logs…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    No audit logs match your filters
                  </td>
                </tr>
              ) : logs.map(log => {
                const meta = ACTION_META[log.action];
                return (
                  <tr key={log.id}>
                    <td>
                      <span className={cn('badge inline-flex items-center gap-1', meta?.color ?? 'badge-gray')}>
                        {meta?.icon}
                        {meta?.label ?? log.action}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-gray-900">{log.userName}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {ROLE_LABELS[log.userRole] ?? log.userRole}
                      </p>
                    </td>
                    <td>
                      <p className="text-sm text-gray-700">{log.resource}</p>
                      {log.resourceName && (
                        <p className="text-xs text-gray-400">{log.resourceName}</p>
                      )}
                    </td>
                    <td className="text-sm text-gray-600 max-w-xs">
                      <p className="truncate" title={log.description}>{log.description}</p>
                    </td>
                    <td className="text-sm font-mono text-gray-500">{log.ipAddress ?? '—'}</td>
                    <td className="text-sm text-gray-500 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-400">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} events
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost btn-sm"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1
                  : page <= 3 ? i + 1
                  : page >= totalPages - 2 ? totalPages - 4 + i
                  : page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn('btn-sm w-8 justify-center', p === page ? 'btn-primary' : 'btn-ghost')}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
          {total} event{total !== 1 ? 's' : ''} total in log
        </div>
      </div>
    </div>
  );
};
