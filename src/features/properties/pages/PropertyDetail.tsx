import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Edit2, MapPin, Hash, Building2, User2, Phone,
  Wifi, WifiOff, AlertCircle, Zap, FileText, StickyNote,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { PropertyForm } from './PropertyForm';
import { propertiesApi } from '@/features/properties/api/properties';
import { connectionsApi } from '@/features/billing/api/billing';
import { billsApi } from '@/features/billing/api/billing';
import { customersApi } from '@/features/customers/api/customers';
import { formatCurrency, formatDate, cn, statusColor } from '@/shared/utils/utils';
import type { Property, PropertyType, PropertyConnectionStatus, Connection, Bill, Customer } from '@/types';

type DetailTab = 'overview' | 'connections' | 'billing';

const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',     icon: <Building2 className="w-4 h-4" /> },
  { id: 'connections',  label: 'Connections',  icon: <Zap       className="w-4 h-4" /> },
  { id: 'billing',      label: 'Billing',      icon: <FileText  className="w-4 h-4" /> },
];

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'Residential', commercial: 'Commercial',
  industrial: 'Industrial', institutional: 'Institutional',
};

const PROPERTY_TYPE_BADGE: Record<PropertyType, string> = {
  residential: 'badge-blue', commercial: 'badge-purple',
  industrial: 'badge-yellow', institutional: 'badge-green',
};

const CONN_STATUS_CONFIG: Record<PropertyConnectionStatus, { label: string; icon: React.ReactNode; className: string }> = {
  connected:     { label: 'Connected',     icon: <Wifi        className="w-3.5 h-3.5" />, className: 'text-green-700 bg-green-50' },
  not_connected: { label: 'Not Connected', icon: <WifiOff     className="w-3.5 h-3.5" />, className: 'text-gray-500 bg-gray-100' },
  disconnected:  { label: 'Disconnected',  icon: <AlertCircle className="w-3.5 h-3.5" />, className: 'text-red-600 bg-red-50'   },
};

export const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty]   = useState<Property | undefined>(undefined);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [bills, setBills]         = useState<Bill[]>([]);
  const [owner, setOwner]         = useState<Customer | undefined>(undefined);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<DetailTab>('overview');
  const [showEdit, setShowEdit]   = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    propertiesApi
      .getOne(id)
      .then((prop) => {
        setProperty(prop);
        // Fetch related data in parallel
        return Promise.all([
          connectionsApi.list({ propertyId: id, limit: 100 }).then((r) => setConnections(r.data)).catch(() => {}),
          prop.customerId
            ? customersApi.getOne(prop.customerId).then((c) => setOwner(c)).catch(() => {})
            : Promise.resolve(),
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (connections.length === 0) { setBills([]); return; }
    const connIds = connections.map((c) => c.id);
    billsApi
      .list({ connectionIds: connIds.join(','), limit: 200 })
      .then((r) => setBills(r.data))
      .catch(() => {});
  }, [connections]);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">
        <p>Loading property…</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="py-20 text-center text-gray-400">
        <p>Property not found.</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/properties')}>Back to Properties</button>
      </div>
    );
  }

  const handleEditSaved = (data?: Record<string, string>) => {
    if (data && id) {
      propertiesApi.getOne(id).then((prop) => setProperty(prop)).catch(() => {});
    }
    setShowEdit(false);
  };

  const connCfg = CONN_STATUS_CONFIG[property.connectionStatus];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/properties')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Properties
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">{property.address}</span>
      </div>

      {/* Header card */}
      <div className="card p-6 flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 flex-shrink-0">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{property.address}</h1>
              {property.unitNumber && (
                <p className="text-sm text-gray-500">Unit {property.unitNumber}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {property.plotNumber && (
                  <span className="text-sm font-mono text-primary-600">{property.plotNumber}</span>
                )}
                <span className={cn('badge', PROPERTY_TYPE_BADGE[property.propertyType])}>
                  {PROPERTY_TYPE_LABELS[property.propertyType]}
                </span>
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', connCfg.className)}>
                  {connCfg.icon} {connCfg.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={property.status} />
              <button className="btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            {property.zoneName && (
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{property.zoneName}</span>
            )}
            {property.ownerPhone && (
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{property.ownerPhone}</span>
            )}
            {property.latitude != null && property.longitude != null && (
              <span className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
                {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Connections',  value: connections.length,                                      color: 'text-blue-600' },
          { label: 'Active Conns', value: connections.filter((c) => c.status === 'active').length, color: 'text-green-600' },
          { label: 'Total Bills',  value: bills.length,                                            color: 'text-purple-600' },
          { label: 'Outstanding',  value: formatCurrency(bills.reduce((s, b) => s + b.balance, 0)), color: bills.some((b) => b.balance > 0) ? 'text-red-600' : 'text-gray-700' },
        ].map((item) => (
          <div key={item.label} className="card p-4 text-center">
            <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Property details */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" /> Property Information
              </h3>
            </div>
            <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Property ID',        value: property.id },
                { label: 'Plot Number',        value: property.plotNumber ?? '—' },
                { label: 'Unit Number',        value: property.unitNumber ?? '—' },
                { label: 'Physical Address',   value: property.address },
                { label: 'Property Type',      value: <span className={cn('badge', PROPERTY_TYPE_BADGE[property.propertyType])}>{PROPERTY_TYPE_LABELS[property.propertyType]}</span> },
                { label: 'Zone',               value: property.zoneName ?? '—' },
                { label: 'Connection Status',  value: <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', connCfg.className)}>{connCfg.icon} {connCfg.label}</span> },
                { label: 'GPS (Lat, Lng)',     value: property.latitude != null ? `${property.latitude}, ${property.longitude}` : '—' },
                { label: 'Status',             value: <span className={cn('badge capitalize', statusColor(property.status))}>{property.status}</span> },
                { label: 'Registered On',      value: formatDate(property.createdAt) },
              ].map((row) => (
                <div key={row.label} className="flex gap-2">
                  <span className="text-gray-500 w-36 flex-shrink-0">{row.label}</span>
                  <span className="text-gray-900 font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Owner */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User2 className="w-4 h-4 text-gray-400" /> Owner
              </h3>
            </div>
            <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Name',           value: property.customerName ?? '—' },
                { label: 'Customer No.',   value: owner?.customerNo ?? '—' },
                { label: 'Phone',          value: property.ownerPhone ?? owner?.phone ?? '—' },
                { label: 'Email',          value: owner?.email ?? '—' },
              ].map((row) => (
                <div key={row.label} className="flex gap-2">
                  <span className="text-gray-500 w-36 flex-shrink-0">{row.label}</span>
                  <span className="text-gray-900 font-medium">
                    {row.label === 'Customer No.' && owner ? (
                      <button
                        className="text-primary-600 hover:underline"
                        onClick={() => navigate(`/customers/${owner.id}`)}
                      >
                        {row.value}
                      </button>
                    ) : row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Occupant (if different) */}
          {(property.occupantName || property.occupantPhone) && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User2 className="w-4 h-4 text-gray-400" /> Occupant / Tenant
                </h3>
              </div>
              <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Name',  value: property.occupantName  ?? '—' },
                  { label: 'Phone', value: property.occupantPhone ?? '—' },
                ].map((row) => (
                  <div key={row.label} className="flex gap-2">
                    <span className="text-gray-500 w-36 flex-shrink-0">{row.label}</span>
                    <span className="text-gray-900 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {property.notes && (
            <div className="card p-4 bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <StickyNote className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{property.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONNECTIONS TAB ───────────────────────────────────────────────────── */}
      {tab === 'connections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Connections & Meters ({connections.length})</h3>
            <button className="btn-secondary btn-sm" onClick={() => navigate('/connections')}>
              View All Connections
            </button>
          </div>
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Meter Serial</th>
                    <th>Type</th>
                    <th>Tariff</th>
                    <th>Deposit</th>
                    <th>Status</th>
                    <th>Connected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {connections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                        No connections on this property
                      </td>
                    </tr>
                  ) : connections.map((cn) => (
                    <tr key={cn.id}>
                      <td className="font-medium text-primary-600 font-mono text-xs">{cn.accountNumber}</td>
                      <td className="font-mono text-xs">{cn.meterSerial ?? '—'}</td>
                      <td className="capitalize">{cn.connectionType}</td>
                      <td>{cn.tariffName ?? '—'}</td>
                      <td>{cn.deposit != null ? formatCurrency(cn.deposit) : '—'}</td>
                      <td><Badge label={cn.status} /></td>
                      <td className="text-gray-600">{formatDate(cn.connectedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── BILLING TAB ───────────────────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Billing History ({bills.length})</h3>
          </div>

          {/* Balance summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Billed',   value: formatCurrency(bills.reduce((s, b) => s + b.totalAmount, 0)), color: 'text-gray-900' },
              { label: 'Total Paid',     value: formatCurrency(bills.reduce((s, b) => s + b.amountPaid, 0)),  color: 'text-green-700' },
              { label: 'Outstanding',    value: formatCurrency(bills.reduce((s, b) => s + b.balance, 0)),     color: bills.some(b => b.balance > 0) ? 'text-red-600' : 'text-green-600' },
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
                    <th>Bill #</th>
                    <th>Account</th>
                    <th>Period</th>
                    <th>Units</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Balance</th>
                    <th>Status</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                        No bills for this property
                      </td>
                    </tr>
                  ) : [...bills].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((b) => (
                    <tr key={b.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/bills/${b.id}`)}>
                      <td className="font-medium text-primary-600 text-xs">{b.billNumber}</td>
                      <td className="font-mono text-xs">{b.accountNumber}</td>
                      <td className="text-sm text-gray-600">
                        {formatDate(b.billingPeriodStart)} – {formatDate(b.billingPeriodEnd)}
                      </td>
                      <td>{b.unitsConsumed.toFixed(1)} m³</td>
                      <td className="text-right font-medium">{formatCurrency(b.totalAmount)}</td>
                      <td className={cn('text-right font-medium', b.balance > 0 ? 'text-red-600' : 'text-green-600')}>
                        {formatCurrency(b.balance)}
                      </td>
                      <td><Badge label={b.status} /></td>
                      <td className="text-gray-600">{formatDate(b.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Property" description={property.address} size="lg">
        <PropertyForm
          property={property}
          onSuccess={handleEditSaved}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </div>
  );
};
