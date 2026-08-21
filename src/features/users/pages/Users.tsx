import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserPlus, Search, Edit2, History, UserCheck, UserX, CheckCircle2, XCircle, Shield, Lock,
  Download, LayoutList, Layers, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { usersApi } from '@/features/users/api/users';
import { Modal, ConfirmDialog } from '@/shared/components/ui/Modal';
import { Input, Select } from '@/shared/components/ui/Input';
import type { User, UserRole, Permission, LoginHistory, QueryParams } from '@/types';
import { ROLE_PERMISSIONS } from '@/types';
import { cn } from '@/shared/utils/utils';
import { useAuthStore } from '@/core/auth/authStore';

type PageTab  = 'users' | 'roles';
type ViewMode = 'list' | 'grouped';

// Ordered list of roles by access level for the grouped view
const ROLE_ORDER: UserRole[] = [
  'super_admin','tenant_admin','manager','finance_manager','billing_officer',
  'customer_service','metering_supervisor','meter_reader','accountant','auditor','customer',
];

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:         'Super Admin',
  tenant_admin:        'Utility Manager',
  manager:             'Operations Manager',
  finance_manager:     'Finance Manager',
  billing_officer:     'Billing Officer',
  customer_service:    'Customer Service',
  metering_supervisor: 'Metering Supervisor',
  meter_reader:        'Field Officer',
  accountant:          'Accountant / Cashier',
  auditor:             'Auditor',
  customer:            'Customer',
};

const ROLE_LEVEL: Record<UserRole, string> = {
  super_admin:         'L1',
  tenant_admin:        'L2',
  manager:             'L2',
  finance_manager:     'L3',
  billing_officer:     'L4',
  customer_service:    'L5',
  metering_supervisor: 'L6',
  meter_reader:        'L7',
  accountant:          'L8',
  auditor:             'L9',
  customer:            'L10',
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  super_admin:         'Full system access. System configuration, security and all operations.',
  tenant_admin:        'Overall utility operations and strategic approvals.',
  manager:             'Day-to-day operations management across all modules.',
  finance_manager:     'Billing, payments, financial reports and credit control.',
  billing_officer:     'Bill generation, payment recording and invoice management.',
  customer_service:    'Customer enquiries, complaints and service requests.',
  metering_supervisor: 'Meter management, reading approval and inventory oversight.',
  meter_reader:        'Meter readings capture, field activities and fault reporting.',
  accountant:          'Payments, receipts, and financial reconciliation.',
  auditor:             'Read-only audit and financial review across all modules.',
  customer:            'Own account access only via customer portal.',
};

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin:         'badge-purple',
  tenant_admin:        'badge-blue',
  manager:             'badge-blue',
  finance_manager:     'badge-green',
  billing_officer:     'badge-green',
  customer_service:    'badge-gray',
  metering_supervisor: 'badge-yellow',
  meter_reader:        'badge-yellow',
  accountant:          'badge-gray',
  auditor:             'badge-gray',
  customer:            'badge-gray',
};

const ROLE_OPTIONS = [
  { value: 'tenant_admin',        label: 'Utility Manager (L2)' },
  { value: 'manager',             label: 'Operations Manager (L2)' },
  { value: 'finance_manager',     label: 'Finance Manager (L3)' },
  { value: 'billing_officer',     label: 'Billing Officer (L4)' },
  { value: 'customer_service',    label: 'Customer Service (L5)' },
  { value: 'metering_supervisor', label: 'Metering Supervisor (L6)' },
  { value: 'meter_reader',        label: 'Field Officer (L7)' },
  { value: 'accountant',          label: 'Accountant / Cashier (L8)' },
  { value: 'auditor',             label: 'Auditor (L9)' },
  { value: 'customer',            label: 'Customer (L10)' },
];

const ASSIGNABLE_ROLES = [
  'tenant_admin', 'manager', 'finance_manager', 'billing_officer',
  'customer_service', 'metering_supervisor', 'meter_reader', 'accountant', 'auditor', 'customer',
] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

// Permission display groups (used in matrix — one representative perm per action)
const PERMISSION_GROUPS: { group: string; perms: Permission[] }[] = [
  { group: 'Customers',      perms: ['customers.view','customers.create','customers.update','customers.delete'] },
  { group: 'Properties',     perms: ['properties.view','properties.create','properties.edit'] },
  { group: 'Connections',    perms: ['connections.view','connections.create','connections.edit'] },
  { group: 'Meters',         perms: ['meters.view','meters.create','meters.update','meters.replace','meters.decommission'] },
  { group: 'Readings',       perms: ['readings.view','readings.create','readings.update','readings.approve','readings.reject'] },
  { group: 'Billing',        perms: ['bills.view','billing.generate','billing.approve','billing.cancel','billing.adjust'] },
  { group: 'Payments',       perms: ['payments.view','payments.create','payments.allocate','payments.reverse'] },
  { group: 'Receipts',       perms: ['receipts.view'] },
  { group: 'Arrears',        perms: ['arrears.view','arrears.manage'] },
  { group: 'Disconnections', perms: ['disconnections.view','disconnections.approve','disconnections.execute'] },
  { group: 'Reports',        perms: ['reports.view','reports.export'] },
  { group: 'Notifications',  perms: ['notifications.view','notifications.manage'] },
  { group: 'Inventory',      perms: ['inventory.view','inventory.manage'] },
  { group: 'Settings',       perms: ['settings.view','settings.manage'] },
  { group: 'Users & Roles',  perms: ['users.manage','roles.manage'] },
  { group: 'Audit',          perms: ['audit.view'] },
];

const KEY_ROLES: UserRole[] = [
  'super_admin','tenant_admin','finance_manager','billing_officer',
  'customer_service','metering_supervisor','meter_reader','accountant','auditor','customer',
];

const inviteSchema = z.object({
  name:  z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  role:  z.enum(ASSIGNABLE_ROLES, { required_error: 'Select a role' }),
});
type InviteForm = z.infer<typeof inviteSchema>;

const editSchema = z.object({
  name:   z.string().min(2, 'Full name is required'),
  phone:  z.string().optional(),
  role:   z.enum(ASSIGNABLE_ROLES, { required_error: 'Select a role' }),
  status: z.enum(['active', 'inactive', 'suspended'] as const),
});
type EditForm = z.infer<typeof editSchema>;

// Shared row component used in both list and grouped views
const UserRow = ({
  u, canManage, currentUserId, onEdit, onHistory, onToggle, onDelete, hideRole,
}: {
  u: User;
  canManage: boolean;
  currentUserId?: string;
  onEdit: (u: User) => void;
  onHistory: (u: User) => void;
  onToggle: (u: User) => void;
  onDelete: (u: User) => void;
  hideRole?: boolean;
}) => (
  <tr>
    <td>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
          {u.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{u.name}</p>
          <p className="text-xs text-gray-500">{u.email}</p>
        </div>
      </div>
    </td>
    {!hideRole && (
      <td><span className={cn('badge', ROLE_BADGE[u.role])}>{ROLE_LABELS[u.role]}</span></td>
    )}
    {!hideRole && (
      <td><span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs font-bold">{ROLE_LEVEL[u.role]}</span></td>
    )}
    <td>
      <span className={cn('badge',
        u.status === 'active' ? 'badge-green' :
        u.status === 'suspended' ? 'badge-red' : 'badge-gray'
      )}>
        {u.status}
      </span>
    </td>
    <td className="text-sm text-gray-600">{fmtRelative(u.lastLogin)}</td>
    <td className="text-sm text-gray-600">{u.phone ?? '—'}</td>
    <td className="text-sm text-gray-500">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
    {canManage && (
      <td>
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onEdit(u)} title="Edit user" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onHistory(u)} title="Login history" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary-600">
            <History className="w-4 h-4" />
          </button>
          {u.id !== currentUserId && (<>
            <button
              onClick={() => onToggle(u)}
              title={u.status === 'active' ? 'Deactivate' : 'Activate'}
              className={cn('p-1.5 rounded-lg',
                u.status === 'active'
                  ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                  : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
              )}
            >
              {u.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onDelete(u)}
              title="Delete user permanently"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>)}
        </div>
      </td>
    )}
  </tr>
);

const fmtDate = (iso: string) => {
  try { return format(new Date(iso), 'dd MMM yyyy, HH:mm'); } catch { return iso; }
};

const fmtRelative = (iso?: string): string => {
  if (!iso) return 'Never';
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  } catch { return iso; }
};

export const Users = () => {
  const { user: currentUser } = useAuthStore();
  const [tab, setTab] = useState<PageTab>('users');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toggleUser, setToggleUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const inviteForm = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  // ── Fetch users ──
  const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    const params: Record<string, unknown> = { pageSize: 200 };
    if (search)       params.search = search;
    if (roleFilter)   params.role = roleFilter;
    if (statusFilter) params.status = statusFilter;
    usersApi.list(params as QueryParams)
      .then(r => setUsers(r.data ?? []))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const total    = users.length;
  const active   = users.filter(u => u.status === 'active').length;
  const inactive = users.filter(u => u.status !== 'active').length;
  const roleCount = new Set(users.map(u => u.role)).size;

  // Client-side filtering (already server-filtered but kept for instant UX)
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone ?? '').includes(q)) &&
      (!roleFilter || u.role === roleFilter) &&
      (!statusFilter || u.status === statusFilter)
    );
  });

  // Users grouped by role level for the grouped view
  const grouped = useMemo(() => {
    return ROLE_ORDER
      .map(role => ({ role, users: filtered.filter(u => u.role === role) }))
      .filter(g => g.users.length > 0);
  }, [filtered]);

  // CSV export
  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Phone', 'Role', 'Access Level', 'Status', 'Last Login', 'Joined'],
      ...filtered.map(u => [
        u.name,
        u.email,
        u.phone ?? '',
        ROLE_LABELS[u.role],
        ROLE_LEVEL[u.role],
        u.status,
        u.lastLogin ? fmtRelative(u.lastLogin) : 'Never',
        u.createdAt ? format(new Date(u.createdAt), 'dd/MM/yyyy') : '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'system-users.csv' });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    editForm.reset({
      name: u.name,
      phone: u.phone ?? '',
      role: (ASSIGNABLE_ROLES.includes(u.role as AssignableRole) ? u.role : 'customer') as AssignableRole,
      status: u.status,
    });
  };

  const openHistory = async (u: User) => {
    setHistoryUser(u);
    setHistoryLoading(true);
    setLoginHistory([]);
    try {
      const result = await usersApi.getLoginHistory(u.id, { limit: 20 });
      setLoginHistory((result as any)?.data ?? result ?? []);
    } catch {
      setLoginHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleInvite = async (data: InviteForm) => {
    setSaving(true);
    try {
      const newUser = await usersApi.create({
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        password: Math.random().toString(36).slice(-10), // temporary password; backend should send invite email
      } as any);
      setUsers(prev => [newUser, ...prev]);
      setInviteSent(true);
      setTimeout(() => { setInviteSent(false); setShowInvite(false); inviteForm.reset(); }, 1800);
    } catch {
      // handle silently; form stays open
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: EditForm) => {
    if (!editUser) return;
    setSaving(true);
    try {
      const updated = await usersApi.update(editUser.id, {
        name: data.name,
        phone: data.phone,
        role: data.role as UserRole,
        status: data.status,
      });
      setUsers(prev => prev.map(u => u.id === editUser.id ? updated : u));
      setEditUser(null);
    } catch {
      // handle silently
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleUser) return;
    setSaving(true);
    try {
      if (toggleUser.status === 'active') {
        await usersApi.deactivate(toggleUser.id);
        setUsers(prev => prev.map(u => u.id === toggleUser.id ? { ...u, status: 'inactive' as const } : u));
      } else {
        await usersApi.activate(toggleUser.id);
        setUsers(prev => prev.map(u => u.id === toggleUser.id ? { ...u, status: 'active' as const } : u));
      }
    } catch {
      // handle silently
    } finally {
      setSaving(false);
      setToggleUser(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setSaving(true);
    try {
      await usersApi.delete(deleteUser.id);
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
    } catch {
      // handle silently
    } finally {
      setSaving(false);
      setDeleteUser(null);
    }
  };

  const canManage = currentUser?.role === 'super_admin' || currentUser?.role === 'tenant_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Access Control</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system users, roles, and granular permissions</p>
        </div>
        {tab === 'users' && (
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                title="List view"
                onClick={() => setViewMode('list')}
                className={cn('px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors',
                  viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                )}
              >
                <LayoutList className="w-3.5 h-3.5" /> List
              </button>
              <button
                title="Group by role"
                onClick={() => setViewMode('grouped')}
                className={cn('px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors border-l border-gray-200',
                  viewMode === 'grouped' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                )}
              >
                <Layers className="w-3.5 h-3.5" /> By Role
              </button>
            </div>
            <button
              onClick={exportCSV}
              className="btn-secondary btn-sm flex items-center gap-1.5"
              title="Export to Excel / CSV"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            {canManage && (
              <button className="btn-primary btn-sm flex items-center gap-1.5" onClick={() => setShowInvite(true)}>
                <UserPlus className="w-4 h-4" /> Invite User
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex">
        {([
          { key: 'users', label: 'System Users', icon: <UserPlus className="w-4 h-4" /> },
          { key: 'roles', label: 'Roles & Permissions', icon: <Shield className="w-4 h-4" /> },
        ] as { key: PageTab; label: string; icon: React.ReactNode }[]).map(t => (
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

      {/* ── Roles & Permissions tab ────────────────────────────────────────────── */}
      {tab === 'roles' && (
        <div className="space-y-6">
          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {KEY_ROLES.map(role => {
              const perms = ROLE_PERMISSIONS[role];
              return (
                <div key={role} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-water-100 text-water-700 text-xs font-bold">
                          {ROLE_LEVEL[role]}
                        </span>
                        <h3 className="font-semibold text-gray-900 text-sm">{ROLE_LABELS[role]}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{ROLE_DESCRIPTION[role]}</p>
                    </div>
                    <Lock className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.slice(0, 8).map(p => (
                      <span key={p} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600">{p}</span>
                    ))}
                    {perms.length > 8 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-500">+{perms.length - 8} more</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 border-t border-gray-100 pt-2">
                    {perms.length} permissions
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permission matrix */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Permission Matrix</h3>
              <p className="text-xs text-gray-500 mt-0.5">Which roles have which permissions across all modules</p>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600 w-36 sticky left-0 bg-white">Module / Action</th>
                    {KEY_ROLES.map(r => (
                      <th key={r} className="py-3 px-2 font-medium text-center text-gray-600 min-w-[72px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] font-bold text-gray-400">{ROLE_LEVEL[r]}</span>
                          <span className="leading-tight">{ROLE_LABELS[r].split(' ')[0]}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_GROUPS.map(group => (
                    <>
                      <tr key={`hdr-${group.group}`} className="bg-gray-50">
                        <td colSpan={KEY_ROLES.length + 1} className="py-1.5 px-4 font-semibold text-gray-700 text-xs sticky left-0 bg-gray-50">
                          {group.group}
                        </td>
                      </tr>
                      {group.perms.map(perm => (
                        <tr key={perm} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 text-gray-500 font-mono sticky left-0 bg-white">
                            {perm.split('.')[1]}
                          </td>
                          {KEY_ROLES.map(role => {
                            const has = ROLE_PERMISSIONS[role].includes(perm);
                            return (
                              <td key={role} className="py-2 px-2 text-center">
                                {has
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto" />
                                  : <XCircle className="w-3.5 h-3.5 text-gray-200 mx-auto" />
                                }
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Users tab ────────────────────────────────────────────────────────────── */}
      {tab === 'users' && (<>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',   value: total,     color: 'text-gray-900',    bg: 'bg-gray-50' },
          { label: 'Active',        value: active,    color: 'text-green-700',   bg: 'bg-green-50' },
          { label: 'Inactive',      value: inactive,  color: 'text-red-600',     bg: 'bg-red-50' },
          { label: 'Roles in Use',  value: roleCount, color: 'text-primary-700', bg: 'bg-primary-50' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4', s.bg)}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-base sm:w-44">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-base sm:w-36">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={canManage ? 8 : 7} className="text-center py-12 text-gray-400 text-sm">Loading users…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={canManage ? 8 : 7} className="text-center py-12 text-gray-400 text-sm">No users match your filters</td></tr>
                ) : filtered.map(u => (
                  <UserRow key={u.id} u={u} canManage={canManage} currentUserId={currentUser?.id} onEdit={openEdit} onHistory={openHistory} onToggle={setToggleUser} onDelete={setDeleteUser} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {total} users
          </div>
        </div>
      )}

      {/* ── Grouped by role view ── */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {usersLoading ? (
            <div className="card p-12 text-center text-gray-400 text-sm">Loading users…</div>
          ) : grouped.length === 0 ? (
            <div className="card p-12 text-center text-gray-400 text-sm">No users match your filters</div>
          ) : grouped.map(({ role, users: roleUsers }) => (
            <div key={role} className="card overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-water-100 text-water-700 text-xs font-bold flex-shrink-0">
                  {ROLE_LEVEL[role]}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 text-sm">{ROLE_LABELS[role]}</span>
                  <span className="text-xs text-gray-400 ml-2">{ROLE_DESCRIPTION[role]}</span>
                </div>
                <span className={cn('badge ml-auto', ROLE_BADGE[role])}>{roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}</span>
              </div>
              {/* Users in this group */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Phone</th>
                      <th>Joined</th>
                      {canManage && <th className="text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {roleUsers.map(u => (
                      <UserRow key={u.id} u={u} canManage={canManage} currentUserId={currentUser?.id} onEdit={openEdit} onHistory={openHistory} onToggle={setToggleUser} onDelete={setDeleteUser} hideRole />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div className="text-xs text-gray-400 px-1">
            Showing {filtered.length} of {total} users across {grouped.length} role{grouped.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        open={showInvite}
        onClose={() => { setShowInvite(false); setInviteSent(false); inviteForm.reset(); }}
        title="Invite User"
        description="Send an invitation to a new system user"
        footer={inviteSent ? undefined : (
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => { setShowInvite(false); inviteForm.reset(); }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={inviteForm.handleSubmit(handleInvite)} disabled={saving}>
              {saving
                ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Send Invitation'
              }
            </button>
          </div>
        )}
      >
        {inviteSent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Invitation Sent!</p>
            <p className="text-sm text-gray-500 mt-1">
              The user will receive an email with login instructions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Grace Wanjiku"
              error={inviteForm.formState.errors.name?.message}
              {...inviteForm.register('name')}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              error={inviteForm.formState.errors.email?.message}
              {...inviteForm.register('email')}
            />
            <Input
              label="Phone (optional)"
              placeholder="+254 7XX XXX XXX"
              {...inviteForm.register('phone')}
            />
            <Select
              label="Role"
              placeholder="Select a role…"
              options={ROLE_OPTIONS}
              error={inviteForm.formState.errors.role?.message}
              {...inviteForm.register('role')}
            />
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User"
        description={editUser ? `Editing ${editUser.name}` : ''}
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
            <button className="btn-primary" onClick={editForm.handleSubmit(handleEdit)} disabled={saving}>
              {saving
                ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Save Changes'
              }
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Input label="Phone" {...editForm.register('phone')} />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            error={editForm.formState.errors.role?.message}
            {...editForm.register('role')}
          />
          <Select
            label="Status"
            options={[
              { value: 'active',    label: 'Active' },
              { value: 'inactive',  label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
            error={editForm.formState.errors.status?.message}
            {...editForm.register('status')}
          />
        </div>
      </Modal>

      {/* Login History Modal */}
      <Modal
        open={!!historyUser}
        onClose={() => { setHistoryUser(null); setLoginHistory([]); }}
        title="Login History"
        description={historyUser ? `Recent sessions for ${historyUser.name}` : ''}
        size="lg"
      >
        {historyLoading ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading history…</p>
        ) : loginHistory.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No login history available</p>
        ) : (
          <div className="space-y-2">
            {loginHistory.map(h => (
              <div key={h.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <div className={cn(
                  'mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  h.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                )}>
                  {h.status === 'success'
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-sm font-medium',
                      h.status === 'success' ? 'text-gray-900' : 'text-red-600'
                    )}>
                      {h.status === 'success' ? 'Successful login' : 'Failed attempt'}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(h.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {h.ipAddress} · {h.userAgent}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Activate / Deactivate confirm */}
      <ConfirmDialog
        open={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onConfirm={handleToggle}
        loading={saving}
        title={toggleUser?.status === 'active' ? 'Deactivate User' : 'Activate User'}
        message={
          toggleUser?.status === 'active'
            ? `Deactivate ${toggleUser?.name}? They will immediately lose access to the system.`
            : `Reactivate ${toggleUser?.name}? They will regain access to the system.`
        }
        confirmLabel={toggleUser?.status === 'active' ? 'Deactivate' : 'Activate'}
        confirmVariant={toggleUser?.status === 'active' ? 'danger' : 'primary'}
      />

      {/* Delete user confirm */}
      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete User"
        message={`Permanently delete ${deleteUser?.name} (${deleteUser?.email})? This cannot be undone — all their data and access will be removed.`}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />
      </>)}
    </div>
  );
};
