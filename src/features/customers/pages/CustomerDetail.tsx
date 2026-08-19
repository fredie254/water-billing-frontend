import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft, Phone, Mail, MapPin, Edit2, FileText,
  Plus, MessageSquare, PhoneCall, User2, AlertTriangle, ClipboardList,
  Printer, Hash, BadgeCheck, CheckCircle2,
} from 'lucide-react';
import { customersApi } from '@/features/customers/api/customers';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input, Select, Textarea } from '@/shared/components/ui/Input';
import { CustomerForm } from './CustomerForm';
import { formatCurrency, formatDate, formatDateTime, cn, statusColor } from '@/shared/utils/utils';
import type {
  Customer, Bill, Payment, Complaint, ServiceRequest, CustomerCommunication,
  ComplaintCategory, ServiceRequestType, CommunicationType,
} from '@/types';

// ─── constants ────────────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'statement' | 'complaints' | 'requests' | 'communications';

const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',       label: 'Overview',       icon: <User2          className="w-4 h-4" /> },
  { id: 'statement',      label: 'Statement',      icon: <FileText       className="w-4 h-4" /> },
  { id: 'complaints',     label: 'Complaints',     icon: <AlertTriangle  className="w-4 h-4" /> },
  { id: 'requests',       label: 'Service Requests', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'communications', label: 'Communications', icon: <MessageSquare  className="w-4 h-4" /> },
];

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial',
  institutional: 'Institutional', government: 'Government', bulk: 'Bulk Water',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'badge-gray', medium: 'badge-yellow', high: 'badge-red', urgent: 'badge-red',
};

const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  billing_dispute: 'Billing Dispute', low_pressure: 'Low Pressure',
  water_quality: 'Water Quality', meter_tampering: 'Meter Tampering',
  leakage: 'Leakage', disconnection: 'Disconnection',
  service_delivery: 'Service Delivery', other: 'Other',
};

const REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  new_connection: 'New Connection', meter_replacement: 'Meter Replacement',
  reconnection: 'Reconnection', disconnection_request: 'Disconnection Request',
  tariff_change: 'Tariff Change', account_transfer: 'Account Transfer',
  meter_reading_dispute: 'Reading Dispute', other: 'Other',
};

const COMM_TYPE_ICON: Record<CommunicationType, React.ReactNode> = {
  sms:        <MessageSquare className="w-3.5 h-3.5" />,
  email:      <Mail          className="w-3.5 h-3.5" />,
  phone_call: <PhoneCall     className="w-3.5 h-3.5" />,
  in_person:  <User2         className="w-3.5 h-3.5" />,
  letter:     <FileText      className="w-3.5 h-3.5" />,
};

// ─── schemas ─────────────────────────────────────────────────────────────────

const complaintSchema = z.object({
  category:    z.enum(['billing_dispute', 'low_pressure', 'water_quality', 'meter_tampering', 'leakage', 'disconnection', 'service_delivery', 'other']),
  subject:     z.string().min(3, 'Subject is required'),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  priority:    z.enum(['low', 'medium', 'high', 'urgent']),
});
type ComplaintForm = z.infer<typeof complaintSchema>;

const requestSchema = z.object({
  requestType:  z.enum(['new_connection', 'meter_replacement', 'reconnection', 'disconnection_request', 'tariff_change', 'account_transfer', 'meter_reading_dispute', 'other']),
  subject:      z.string().min(3, 'Subject is required'),
  description:  z.string().min(10, 'Please describe your request in more detail'),
});
type RequestForm = z.infer<typeof requestSchema>;

const communicationSchema = z.object({
  type:      z.enum(['sms', 'email', 'phone_call', 'in_person', 'letter']),
  direction: z.enum(['inbound', 'outbound']),
  subject:   z.string().optional(),
  message:   z.string().min(5, 'Message / note is required'),
});
type CommunicationForm = z.infer<typeof communicationSchema>;

// ─── component ───────────────────────────────────────────────────────────────

export const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer,   setCustomer]   = useState<Customer | undefined>(undefined);
  const [bills,      setBills]      = useState<Bill[]>([]);
  const [payments,   setPayments]   = useState<Payment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);

  const [complaints,   setComplaints]   = useState<Complaint[]>([]);
  const [requests,     setRequests]     = useState<ServiceRequest[]>([]);
  const [comms,        setComms]        = useState<CustomerCommunication[]>([]);

  const [tab,          setTab]          = useState<DetailTab>('overview');
  const [showEdit,     setShowEdit]     = useState(false);
  const [showCpForm,   setShowCpForm]   = useState(false);
  const [showSrForm,   setShowSrForm]   = useState(false);
  const [showCommForm, setShowCommForm] = useState(false);
  const [expandedCp,   setExpandedCp]  = useState<string | null>(null);

  const cpForm   = useForm<ComplaintForm>({ resolver: zodResolver(complaintSchema), defaultValues: { priority: 'medium' } });
  const srForm   = useForm<RequestForm>({ resolver: zodResolver(requestSchema) });
  const commForm = useForm<CommunicationForm>({ resolver: zodResolver(communicationSchema), defaultValues: { direction: 'outbound', type: 'sms' } });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [customerData, billsRes, paymentsRes] = await Promise.all([
          customersApi.getOne(id),
          customersApi.getBills(id, { pageSize: 200 }),
          customersApi.getPayments(id, { pageSize: 200 }),
        ]);
        if (cancelled) return;
        setCustomer(customerData);
        setBills(billsRes.data ?? []);
        setPayments(paymentsRes.data ?? []);
        setNotFound(false);
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          console.error('Failed to load customer:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  // statement: combine bills + payments sorted by date
  const stmtRows = useMemo(() => {
    const rows = [
      ...bills.map((b) => ({
        date: b.issuedAt ?? b.createdAt,
        ref: b.billNumber,
        description: `Bill — ${new Date(b.billingPeriodStart).toLocaleString('en', { month: 'short', year: 'numeric' })} · ${b.unitsConsumed.toFixed(1)} m³`,
        debit: b.totalAmount,
        credit: 0,
      })),
      ...payments.map((p) => ({
        date: p.paidAt,
        ref: p.paymentNumber,
        description: `Payment — ${p.paymentMethod.replace(/_/g, ' ')}${p.mpesaCode ? ` · ${p.mpesaCode}` : p.reference ? ` · ${p.reference}` : ''}`,
        debit: 0,
        credit: p.amount,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    let balance = 0;
    return rows.map((row) => {
      balance += row.debit - row.credit;
      return { ...row, balance };
    });
  }, [bills, payments]);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">
        <span className="inline-block w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm">Loading customer…</p>
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="py-20 text-center text-gray-400">
        <p>Customer not found.</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/customers')}>Back to Customers</button>
      </div>
    );
  }

  const handleEditSaved = (updatedCustomer?: Customer) => {
    if (updatedCustomer) {
      setCustomer(updatedCustomer);
    }
    setShowEdit(false);
  };

  const handleLogComplaint = async (data: ComplaintForm) => {
    await new Promise((r) => setTimeout(r, 500));
    const newCp: Complaint = {
      id: `cp${Date.now()}`, tenantId: 't1',
      customerId: customer.id, customerName: customer.name,
      accountNumber: undefined,
      ...data, status: 'open',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setComplaints((prev) => [newCp, ...prev]);
    cpForm.reset({ priority: 'medium' });
    setShowCpForm(false);
  };

  const handleLogRequest = async (data: RequestForm) => {
    await new Promise((r) => setTimeout(r, 500));
    const newSr: ServiceRequest = {
      id: `sr${Date.now()}`, tenantId: 't1',
      customerId: customer.id, customerName: customer.name,
      accountNumber: undefined,
      ...data, status: 'pending',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setRequests((prev) => [newSr, ...prev]);
    srForm.reset();
    setShowSrForm(false);
  };

  const handleLogComm = async (data: CommunicationForm) => {
    await new Promise((r) => setTimeout(r, 500));
    const newComm: CustomerCommunication = {
      id: `cm${Date.now()}`, tenantId: 't1',
      customerId: customer.id,
      ...data, status: data.direction === 'outbound' ? 'sent' : 'received',
      staffName: 'Current User',
      createdAt: new Date().toISOString(),
    };
    setComms((prev) => [newComm, ...prev]);
    commForm.reset({ direction: 'outbound', type: 'sms' });
    setShowCommForm(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/customers')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Customers
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">{customer.name}</span>
      </div>

      {/* Header card */}
      <div className="card p-6 flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 text-2xl font-bold flex-shrink-0">
          {customer.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              {customer.companyName && customer.companyName !== customer.name && (
                <p className="text-sm text-gray-500">{customer.companyName}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm font-mono text-primary-600">{customer.customerNo}</span>
                {customer.customerType && (
                  <span className="badge badge-blue">{CUSTOMER_TYPE_LABELS[customer.customerType]}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={customer.status} />
              <button className="btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            {customer.phone  && <span className="flex items-center gap-1.5"><Phone  className="w-3.5 h-3.5 text-gray-400" />{customer.phone}</span>}
            {customer.email  && <span className="flex items-center gap-1.5"><Mail   className="w-3.5 h-3.5 text-gray-400" />{customer.email}</span>}
            {customer.address && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{customer.address}</span>}
            {customer.idNumber && (
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span className="capitalize">{customer.idType?.replace(/_/g, ' ') ?? 'ID'}:</span>
                <span className="font-mono">{customer.idNumber}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Bills Issued', value: bills.length,                                  color: 'text-purple-600' },
          { label: 'Payments',     value: payments.length,                               color: 'text-blue-600' },
          { label: 'Total Paid',   value: formatCurrency(totalPaid),                     color: 'text-green-600' },
          { label: 'Outstanding',  value: formatCurrency(customer.outstandingBalance ?? 0), color: customer.outstandingBalance ? 'text-red-600' : 'text-gray-700' },
        ].map((item) => (
          <div key={item.label} className="card p-4 text-center">
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t.icon} {t.label}
              {t.id === 'complaints'     && complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length > 0 && (
                <span className="ml-1 w-4 h-4 bg-red-100 text-red-600 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length}
                </span>
              )}
              {t.id === 'requests' && requests.filter(r => r.status === 'pending' || r.status === 'in_progress').length > 0 && (
                <span className="ml-1 w-4 h-4 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {requests.filter(r => r.status === 'pending' || r.status === 'in_progress').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Customer info */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-gray-400" /> Customer Information</h3></div>
            <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Customer ID',       value: customer.customerNo },
                { label: 'Customer Type',     value: customer.customerType ? CUSTOMER_TYPE_LABELS[customer.customerType] : '—' },
                { label: 'Full Name',         value: customer.name },
                { label: 'Company Name',      value: customer.companyName ?? '—' },
                { label: 'Phone',             value: customer.phone ?? '—' },
                { label: 'Email',             value: customer.email ?? '—' },
                { label: 'Address',           value: customer.address ?? '—' },
                { label: 'ID Type',           value: customer.idType ? customer.idType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—' },
                { label: 'ID Number',         value: customer.idNumber ?? '—' },
                { label: 'Registration Date', value: formatDate(customer.createdAt) },
                { label: 'Status',            value: <span className={cn('badge capitalize', statusColor(customer.status))}>{customer.status}</span> },
                { label: 'Total Connections', value: String(customer.totalConnections ?? 0) },
              ].map((row) => (
                <div key={row.label} className="flex gap-2">
                  <span className="text-gray-500 w-36 flex-shrink-0">{row.label}</span>
                  <span className="text-gray-900 font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STATEMENT TAB ────────────────────────────────────────────────────── */}
      {tab === 'statement' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Account Statement</h3>
              <p className="text-xs text-gray-500 mt-0.5">{customer.customerNo} · All transactions</p>
            </div>
            <button
              className="btn-secondary btn-sm"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>

          {/* Balance summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Billed',     value: formatCurrency(bills.reduce((s, b) => s + b.totalAmount, 0)),  color: 'text-gray-900' },
              { label: 'Total Paid',       value: formatCurrency(totalPaid),                                       color: 'text-green-700' },
              { label: 'Current Balance',  value: formatCurrency(customer.outstandingBalance ?? 0),                color: customer.outstandingBalance ? 'text-red-600' : 'text-green-600' },
            ].map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th className="text-right">Debit (KES)</th>
                    <th className="text-right">Credit (KES)</th>
                    <th className="text-right">Balance (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stmtRows.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No transactions</td></tr>
                  ) : stmtRows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-gray-600 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="font-mono text-xs text-primary-600">{row.ref}</td>
                      <td className="text-gray-700">{row.description}</td>
                      <td className="text-right">{row.debit > 0 ? <span className="text-red-600 font-medium">{formatCurrency(row.debit)}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="text-right">{row.credit > 0 ? <span className="text-green-600 font-medium">{formatCurrency(row.credit)}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className={cn('text-right font-medium', row.balance > 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(Math.abs(row.balance))}{row.balance > 0 ? ' Dr' : row.balance < 0 ? ' Cr' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLAINTS TAB ───────────────────────────────────────────────────── */}
      {tab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Complaints ({complaints.length})</h3>
            <button className="btn-primary btn-sm" onClick={() => setShowCpForm(true)}>
              <Plus className="w-4 h-4" /> Log Complaint
            </button>
          </div>

          {complaints.length === 0 ? (
            <div className="card p-12 text-center text-gray-400 text-sm">No complaints on record</div>
          ) : complaints.map((cp) => (
            <div key={cp.id} className="card overflow-hidden">
              <div
                className="p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedCp(expandedCp === cp.id ? null : cp.id)}
              >
                <AlertTriangle className={cn('w-4 h-4 flex-shrink-0 mt-0.5', cp.priority === 'urgent' || cp.priority === 'high' ? 'text-red-500' : 'text-yellow-500')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{cp.subject}</p>
                    <span className={cn('badge', PRIORITY_BADGE[cp.priority])}>{cp.priority}</span>
                    <span className={cn('badge', statusColor(cp.status))}>{cp.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {COMPLAINT_CATEGORY_LABELS[cp.category]} · {formatDate(cp.createdAt)}
                    {cp.assignedTo && ` · Assigned to ${cp.assignedTo}`}
                  </p>
                </div>
              </div>
              {expandedCp === cp.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <p className="text-gray-700">{cp.description}</p>
                  {cp.resolution && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-green-700">Resolution</p>
                        <p className="text-gray-700 text-xs mt-0.5">{cp.resolution}</p>
                        {cp.resolvedAt && <p className="text-xs text-gray-400 mt-1">Resolved {formatDate(cp.resolvedAt)}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SERVICE REQUESTS TAB ─────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Service Requests ({requests.length})</h3>
            <button className="btn-primary btn-sm" onClick={() => setShowSrForm(true)}>
              <Plus className="w-4 h-4" /> New Request
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="card p-12 text-center text-gray-400 text-sm">No service requests on record</div>
          ) : requests.map((sr) => (
            <div key={sr.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{sr.subject}</p>
                    <span className="badge badge-gray">{REQUEST_TYPE_LABELS[sr.requestType]}</span>
                    <span className={cn('badge', statusColor(sr.status))}>{sr.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Submitted {formatDate(sr.createdAt)}
                    {sr.assignedTo && ` · Assigned to ${sr.assignedTo}`}
                    {sr.completedAt && ` · Completed ${formatDate(sr.completedAt)}`}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{sr.description}</p>
              {sr.notes && (
                <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  <span className="font-semibold">Staff note:</span> {sr.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── COMMUNICATIONS TAB ───────────────────────────────────────────────── */}
      {tab === 'communications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Communication History ({comms.length})</h3>
            <button className="btn-primary btn-sm" onClick={() => setShowCommForm(true)}>
              <Plus className="w-4 h-4" /> Log Communication
            </button>
          </div>

          {comms.length === 0 ? (
            <div className="card p-12 text-center text-gray-400 text-sm">No communications recorded</div>
          ) : (
            <div className="space-y-3">
              {[...comms].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((cm) => (
                <div key={cm.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      cm.direction === 'outbound' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      {COMM_TYPE_ICON[cm.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {cm.type.replace(/_/g, ' ')}
                        </span>
                        <span className={cn('badge text-[10px]', cm.direction === 'outbound' ? 'badge-blue' : 'badge-gray')}>
                          {cm.direction}
                        </span>
                        {cm.subject && <span className="text-sm text-gray-500">— {cm.subject}</span>}
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{cm.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateTime(cm.createdAt)}
                        {cm.staffName && ` · ${cm.staffName}`}
                        {' · '}<span className={cn(cm.status === 'delivered' || cm.status === 'received' ? 'text-green-600' : cm.status === 'failed' ? 'text-red-500' : 'text-gray-400')}>
                          {cm.status}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}

      {/* Edit customer */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Customer" description={customer.name} size="lg">
        <CustomerForm
          customer={customer}
          onSuccess={handleEditSaved}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      {/* Log complaint */}
      <Modal
        open={showCpForm}
        onClose={() => setShowCpForm(false)}
        title="Log Complaint"
        description="Record a new customer complaint"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setShowCpForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={cpForm.handleSubmit(handleLogComplaint)} disabled={cpForm.formState.isSubmitting}>
              {cpForm.formState.isSubmitting ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Complaint'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" {...cpForm.register('category')} placeholder="Select category" error={cpForm.formState.errors.category?.message}
              options={Object.entries(COMPLAINT_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            <Select label="Priority" {...cpForm.register('priority')} error={cpForm.formState.errors.priority?.message}
              options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
          </div>
          <Input label="Subject" {...cpForm.register('subject')} error={cpForm.formState.errors.subject?.message} placeholder="Brief description of the issue" />
          <Textarea label="Description" {...cpForm.register('description')} error={cpForm.formState.errors.description?.message} placeholder="Detailed description of the complaint…" />
        </div>
      </Modal>

      {/* Log service request */}
      <Modal
        open={showSrForm}
        onClose={() => setShowSrForm(false)}
        title="New Service Request"
        description="Submit a service request for this customer"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setShowSrForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={srForm.handleSubmit(handleLogRequest)} disabled={srForm.formState.isSubmitting}>
              {srForm.formState.isSubmitting ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Request'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select label="Request Type" {...srForm.register('requestType')} placeholder="Select request type" error={srForm.formState.errors.requestType?.message}
            options={Object.entries(REQUEST_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <Input label="Subject" {...srForm.register('subject')} error={srForm.formState.errors.subject?.message} placeholder="Brief description of the request" />
          <Textarea label="Description" {...srForm.register('description')} error={srForm.formState.errors.description?.message} placeholder="Detailed description of what is needed…" />
        </div>
      </Modal>

      {/* Log communication */}
      <Modal
        open={showCommForm}
        onClose={() => setShowCommForm(false)}
        title="Log Communication"
        description="Record a communication event with this customer"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setShowCommForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={commForm.handleSubmit(handleLogComm)} disabled={commForm.formState.isSubmitting}>
              {commForm.formState.isSubmitting ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Record'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" {...commForm.register('type')} error={commForm.formState.errors.type?.message}
              options={[{ value: 'sms', label: 'SMS' }, { value: 'email', label: 'Email' }, { value: 'phone_call', label: 'Phone Call' }, { value: 'in_person', label: 'In Person' }, { value: 'letter', label: 'Letter' }]} />
            <Select label="Direction" {...commForm.register('direction')} error={commForm.formState.errors.direction?.message}
              options={[{ value: 'outbound', label: 'Outbound (to customer)' }, { value: 'inbound', label: 'Inbound (from customer)' }]} />
          </div>
          <Input label="Subject (optional)" {...commForm.register('subject')} placeholder="e.g. Bill Notification" />
          <Textarea label="Message / Notes" {...commForm.register('message')} error={commForm.formState.errors.message?.message} placeholder="Full message or call notes…" />
        </div>
      </Modal>
    </div>
  );
};
