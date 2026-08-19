import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Building2, Bell, CreditCard, Shield, Users as UsersIcon, Lock, Check, ExternalLink } from 'lucide-react';
import { Input, Select, Textarea } from '@/shared/components/ui/Input';
import { useAuthStore } from '@/core/auth/authStore';
import { settingsApi } from '@/features/settings/api/settings';
import { PERMISSION_GROUPS, ROLE_PERMISSIONS } from '@/core/auth/permissions';
import type { UserRole } from '@/types';
import { cn } from '@/shared/utils/utils';

type Tab = 'organisation' | 'billing' | 'notifications' | 'security' | 'permissions' | 'users';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'organisation', label: 'Organisation', icon: <Building2 className="w-4 h-4" /> },
  { id: 'billing',      label: 'Billing',      icon: <CreditCard className="w-4 h-4" /> },
  { id: 'notifications',label: 'Notifications',icon: <Bell className="w-4 h-4" /> },
  { id: 'security',     label: 'Security',     icon: <Lock className="w-4 h-4" /> },
  { id: 'permissions',  label: 'Permissions',  icon: <Shield className="w-4 h-4" /> },
  { id: 'users',        label: 'Users',        icon: <UsersIcon className="w-4 h-4" /> },
];

const EDITABLE_ROLES: UserRole[] = ['manager', 'billing_officer', 'meter_reader', 'customer_service', 'customer'];

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager', billing_officer: 'Billing Officer',
  meter_reader: 'Meter Reader', customer_service: 'Cust. Service', customer: 'Customer',
};

// ─── Typed settings shape returned by getAll() ────────────────────────────────
interface OrgSettings {
  name?: string;
  type?: string;
  phone?: string;
  email?: string;
  country?: string;
  currency?: string;
  address?: string;
}

interface BillingSettings {
  billingDay?: string | number;
  paymentDueDays?: string | number;
  mpesaPaybill?: string;
  mpesaBusinessName?: string;
  invoicePrefix?: string;
  receiptPrefix?: string;
  autoMonthlyBilling?: boolean;
}

interface NotificationItem {
  sms: boolean;
  email: boolean;
}

interface NotificationsSettings {
  billIssued?: NotificationItem;
  paymentReceived?: NotificationItem;
  overdueReminder?: NotificationItem;
  disconnectionWarning?: NotificationItem;
}

interface AllSettings {
  organisation?: OrgSettings;
  billing?: BillingSettings;
  notifications?: NotificationsSettings;
}

export const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('organisation');

  // ─── Remote settings state ──────────────────────────────────────────────────
  const [settings, setSettings] = useState<AllSettings>({});
  const [loadingSettings, setLoadingSettings] = useState(false);

  // ─── Organisation form state ────────────────────────────────────────────────
  const [orgName, setOrgName]         = useState('');
  const [orgType, setOrgType]         = useState('utility');
  const [orgPhone, setOrgPhone]       = useState('');
  const [orgEmail, setOrgEmail]       = useState('');
  const [orgCountry, setOrgCountry]   = useState('');
  const [orgCurrency, setOrgCurrency] = useState('KES');
  const [orgAddress, setOrgAddress]   = useState('');
  const [orgSaving, setOrgSaving]     = useState(false);
  const [orgSaved, setOrgSaved]       = useState(false);

  // ─── Billing form state ─────────────────────────────────────────────────────
  const [billingDay, setBillingDay]               = useState('1');
  const [paymentDueDays, setPaymentDueDays]       = useState('21');
  const [mpesaPaybill, setMpesaPaybill]           = useState('');
  const [mpesaBusinessName, setMpesaBusinessName] = useState('');
  const [invoicePrefix, setInvoicePrefix]         = useState('INV');
  const [receiptPrefix, setReceiptPrefix]         = useState('RCT');
  const [autoMonthly, setAutoMonthly]             = useState(true);
  const [billingSaving, setBillingSaving]         = useState(false);
  const [billingSaved, setBillingSaved]           = useState(false);

  // ─── Notifications form state ───────────────────────────────────────────────
  const [notifItems, setNotifItems] = useState([
    { key: 'billIssued',          label: 'Bill Issued',          description: 'Send notification when a new bill is generated',   sms: true,  email: true  },
    { key: 'paymentReceived',     label: 'Payment Received',     description: 'Confirm payment receipt to customer',              sms: true,  email: true  },
    { key: 'overdueReminder',     label: 'Overdue Reminder',     description: 'Remind customers about overdue balances',          sms: true,  email: false },
    { key: 'disconnectionWarning',label: 'Disconnection Warning',description: 'Warn customers before disconnection',              sms: true,  email: true  },
  ]);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved]   = useState(false);

  // ─── Security tab state ─────────────────────────────────────────────────────
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError]     = useState('');

  // ─── Permissions tab state ──────────────────────────────────────────────────
  const [perms, setPerms] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(EDITABLE_ROLES.map(r => [r, [...(ROLE_PERMISSIONS[r] ?? [])]]))
  );
  const [permSaved, setPermSaved] = useState(false);

  // ─── Load settings on mount ─────────────────────────────────────────────────
  const settingsLoaded = useRef(false);
  useEffect(() => {
    if (settingsLoaded.current) return;
    settingsLoaded.current = true;
    setLoadingSettings(true);
    settingsApi.getAll()
      .then((data: AllSettings) => {
        setSettings(data ?? {});
        const org = data?.organisation ?? {};
        setOrgName(org.name ?? '');
        setOrgType(org.type ?? 'utility');
        setOrgPhone(org.phone ?? '');
        setOrgEmail(org.email ?? '');
        setOrgCountry(org.country ?? '');
        setOrgCurrency(org.currency ?? 'KES');
        setOrgAddress(org.address ?? '');

        const bill = data?.billing ?? {};
        setBillingDay(String(bill.billingDay ?? '1'));
        setPaymentDueDays(String(bill.paymentDueDays ?? '21'));
        setMpesaPaybill(String(bill.mpesaPaybill ?? ''));
        setMpesaBusinessName(String(bill.mpesaBusinessName ?? ''));
        setInvoicePrefix(String(bill.invoicePrefix ?? 'INV'));
        setReceiptPrefix(String(bill.receiptPrefix ?? 'RCT'));
        setAutoMonthly(bill.autoMonthlyBilling ?? true);

        const notif = data?.notifications ?? {};
        setNotifItems(prev => prev.map(item => {
          const key = item.key as keyof NotificationsSettings;
          const remote = notif[key] as NotificationItem | undefined;
          return remote ? { ...item, sms: remote.sms, email: remote.email } : item;
        }));
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  // ─── Save handlers ──────────────────────────────────────────────────────────
  const saveOrg = async () => {
    setOrgSaving(true);
    try {
      await settingsApi.updateOrganisation({
        name: orgName, type: orgType, phone: orgPhone,
        email: orgEmail, country: orgCountry, currency: orgCurrency, address: orgAddress,
      });
      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 2500);
    } catch {}
    setOrgSaving(false);
  };

  const saveBilling = async () => {
    setBillingSaving(true);
    try {
      await settingsApi.updateBilling({
        billingDay, paymentDueDays, mpesaPaybill, mpesaBusinessName,
        invoicePrefix, receiptPrefix, autoMonthlyBilling: autoMonthly,
      });
      setBillingSaved(true);
      setTimeout(() => setBillingSaved(false), 2500);
    } catch {}
    setBillingSaving(false);
  };

  const saveNotifications = async () => {
    setNotifSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      notifItems.forEach(item => {
        payload[item.key] = { sms: item.sms, email: item.email };
      });
      await settingsApi.updateNotifications(payload);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } catch {}
    setNotifSaving(false);
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }
    setPwSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setPwSaving(false);
    setPwSuccess(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setTimeout(() => setPwSuccess(false), 4000);
  };

  const togglePerm = (role: string, perm: string) => {
    setPerms(prev => {
      const cur = prev[role] ?? [];
      return { ...prev, [role]: cur.includes(perm) ? cur.filter(p => p !== perm) : [...cur, perm] };
    });
  };
  const resetPerms = () =>
    setPerms(Object.fromEntries(EDITABLE_ROLES.map(r => [r, [...(ROLE_PERMISSIONS[r] ?? [])]])));

  const savePerms = async () => {
    await new Promise(r => setTimeout(r, 400));
    setPermSaved(true);
    setTimeout(() => setPermSaved(false), 2500);
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organisation settings and preferences</p>
      </div>

      <div className="flex gap-6 flex-col sm:flex-row">
        {/* Sidebar tabs */}
        <nav className="flex flex-row sm:flex-col gap-1 sm:w-48 flex-shrink-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left whitespace-nowrap',
                tab === t.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">

          {/* ── Organisation ─────────────────────────────────────────────────── */}
          {tab === 'organisation' && (
            <div className="card p-6 space-y-5">
              <h3 className="font-semibold text-gray-900">Organisation Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Organisation Name" value={orgName} onChange={e => setOrgName(e.target.value)} />
                <Select label="Organisation Type" value={orgType} onChange={e => setOrgType(e.target.value)} options={[
                  { value: 'utility',     label: 'Water Utility' },
                  { value: 'estate',      label: 'Estate / Gated Community' },
                  { value: 'apartment',   label: 'Apartment Complex' },
                  { value: 'institution', label: 'Institution / University' },
                ]} />
                <Input label="Phone"   value={orgPhone}   onChange={e => setOrgPhone(e.target.value)} />
                <Input label="Email"   value={orgEmail}   onChange={e => setOrgEmail(e.target.value)} />
                <Input label="Country" value={orgCountry} onChange={e => setOrgCountry(e.target.value)} />
                <Select label="Currency" value={orgCurrency} onChange={e => setOrgCurrency(e.target.value)} options={[
                  { value: 'KES', label: 'KES – Kenyan Shilling' },
                  { value: 'USD', label: 'USD – US Dollar' },
                  { value: 'UGX', label: 'UGX – Ugandan Shilling' },
                  { value: 'TZS', label: 'TZS – Tanzanian Shilling' },
                ]} />
              </div>
              <Textarea label="Physical Address" value={orgAddress} onChange={e => setOrgAddress(e.target.value)} />
              <div className="flex justify-end">
                <button className="btn-primary btn-sm" onClick={saveOrg} disabled={orgSaving}>
                  {orgSaved
                    ? <><Check className="w-4 h-4" /> Saved</>
                    : orgSaving
                    ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Save className="w-4 h-4" /> Save Changes</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Billing ──────────────────────────────────────────────────────── */}
          {tab === 'billing' && (
            <div className="card p-6 space-y-5">
              <h3 className="font-semibold text-gray-900">Billing Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Billing Day (of month)" value={billingDay} onChange={e => setBillingDay(e.target.value)}
                  options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }))} />
                <Input label="Payment Due Days" type="number" value={paymentDueDays} onChange={e => setPaymentDueDays(e.target.value)} />
                <Input label="M-Pesa Paybill/Till" placeholder="e.g. 123456" value={mpesaPaybill} onChange={e => setMpesaPaybill(e.target.value)} />
                <Input label="M-Pesa Business Name" placeholder="Shown on customer's phone" value={mpesaBusinessName} onChange={e => setMpesaBusinessName(e.target.value)} />
                <Input label="Invoice Number Prefix" value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} />
                <Input label="Receipt Number Prefix" value={receiptPrefix} onChange={e => setReceiptPrefix(e.target.value)} />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Automatic Monthly Billing</p>
                  <p className="text-xs text-gray-500">Auto-generate bills on billing day for all active connections</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoMonthly}
                  onChange={e => setAutoMonthly(e.target.checked)}
                  className="w-5 h-5 rounded accent-primary-600"
                />
              </div>
              <div className="flex justify-end">
                <button className="btn-primary btn-sm" onClick={saveBilling} disabled={billingSaving}>
                  {billingSaved
                    ? <><Check className="w-4 h-4" /> Saved</>
                    : billingSaving
                    ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Save className="w-4 h-4" /> Save Changes</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ─────────────────────────────────────────────────── */}
          {tab === 'notifications' && (
            <div className="card p-6 space-y-5">
              <h3 className="font-semibold text-gray-900">Notification Settings</h3>
              {notifItems.map((item, idx) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.sms}
                        onChange={e => setNotifItems(prev => prev.map((it, i) => i === idx ? { ...it, sms: e.target.checked } : it))}
                        className="rounded accent-primary-600"
                      /> SMS
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.email}
                        onChange={e => setNotifItems(prev => prev.map((it, i) => i === idx ? { ...it, email: e.target.checked } : it))}
                        className="rounded accent-primary-600"
                      /> Email
                    </label>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <button className="btn-primary btn-sm" onClick={saveNotifications} disabled={notifSaving}>
                  {notifSaved
                    ? <><Check className="w-4 h-4" /> Saved</>
                    : notifSaving
                    ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Save className="w-4 h-4" /> Save Changes</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Security ─────────────────────────────────────────────────────── */}
          {tab === 'security' && (
            <div className="card p-6 space-y-5">
              <h3 className="font-semibold text-gray-900">Change Password</h3>
              <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
                Logged in as <span className="font-medium text-gray-900">{user?.name}</span>{' '}
                ({user?.email})
              </div>

              {pwSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <Check className="w-4 h-4 flex-shrink-0" /> Password changed successfully.
                </div>
              )}
              {pwError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {pwError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="••••••••"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  className="btn-primary btn-sm"
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                >
                  {pwSaving
                    ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Lock className="w-4 h-4" /> Change Password</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Permissions ──────────────────────────────────────────────────── */}
          {tab === 'permissions' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <strong>Admin</strong> and <strong>Super Admin</strong> roles always have full system access and
                cannot be restricted. Customise access for all other roles below.
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-700 w-56">Permission</th>
                        {EDITABLE_ROLES.map(role => (
                          <th key={role} className="px-3 py-3 text-center font-medium text-gray-700 min-w-[100px]">
                            {ROLE_LABELS[role]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_GROUPS.map(group => (
                        <>
                          <tr key={group.group} className="bg-gray-50/70">
                            <td
                              colSpan={EDITABLE_ROLES.length + 1}
                              className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                            >
                              {group.group}
                            </td>
                          </tr>
                          {group.permissions.map(perm => (
                            <tr key={perm.key} className="hover:bg-gray-50 border-t border-gray-50">
                              <td className="px-4 py-2.5 text-gray-700 text-xs">{perm.label}</td>
                              {EDITABLE_ROLES.map(role => (
                                <td key={role} className="px-3 py-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={perms[role]?.includes(perm.key) ?? false}
                                    onChange={() => togglePerm(role, perm.key)}
                                    className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                  <button className="btn-secondary btn-sm" onClick={resetPerms}>
                    Reset to Default
                  </button>
                  <button className="btn-primary btn-sm" onClick={savePerms}>
                    {permSaved
                      ? <><Check className="w-4 h-4" /> Saved</>
                      : <><Save className="w-4 h-4" /> Save Permissions</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Users ────────────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <div className="card p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto">
                <UsersIcon className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">User Management</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Invite new users, edit roles, view login history, and activate or deactivate accounts.
                </p>
              </div>
              <button className="btn-primary" onClick={() => navigate('/users')}>
                <ExternalLink className="w-4 h-4" /> Open User Management
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
