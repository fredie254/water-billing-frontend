import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Building2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { PropertyForm } from './PropertyForm';
import { propertiesApi } from '@/features/properties/api/properties';
import { zonesApi } from '@/features/zones/api/zones';
import { formatDate, cn } from '@/shared/utils/utils';
import type { Property, PropertyType, PropertyConnectionStatus, Zone } from '@/types';

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential:   'Residential',
  commercial:    'Commercial',
  industrial:    'Industrial',
  institutional: 'Institutional',
};

const PROPERTY_TYPE_BADGE: Record<PropertyType, string> = {
  residential:   'badge-blue',
  commercial:    'badge-purple',
  industrial:    'badge-yellow',
  institutional: 'badge-green',
};

const CONN_STATUS_CONFIG: Record<PropertyConnectionStatus, { label: string; icon: React.ReactNode; className: string }> = {
  connected:     { label: 'Connected',     icon: <Wifi        className="w-3.5 h-3.5" />, className: 'text-green-700 bg-green-50' },
  not_connected: { label: 'Not Connected', icon: <WifiOff     className="w-3.5 h-3.5" />, className: 'text-gray-500 bg-gray-100' },
  disconnected:  { label: 'Disconnected',  icon: <AlertCircle className="w-3.5 h-3.5" />, className: 'text-red-600 bg-red-50' },
};

export const Properties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [zones, setZones]           = useState<Zone[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState<PropertyType | ''>('');
  const [connFilter,  setConnFilter]  = useState<PropertyConnectionStatus | ''>('');
  const [zoneFilter,  setZoneFilter]  = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [toDeactivate, setToDeactivate] = useState<Property | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchProperties = () => {
    setLoading(true);
    propertiesApi
      .list({ limit: 500 })
      .then((r) => setProperties(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProperties();
    zonesApi.list({ limit: 200 }).then((r) => setZones(r.data)).catch(() => {});
  }, []);

  const zoneOptions = useMemo(() => [...new Set(properties.map((p) => p.zoneId).filter(Boolean))].map((zid) => {
    const z = zones.find((z) => z.id === zid);
    return { id: zid!, name: z?.name ?? zid! };
  }), [properties, zones]);

  const filtered = useMemo(() => properties.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      search === '' ||
      p.address.toLowerCase().includes(q) ||
      (p.plotNumber?.toLowerCase().includes(q) ?? false) ||
      (p.customerName?.toLowerCase().includes(q) ?? false) ||
      (p.occupantName?.toLowerCase().includes(q) ?? false) ||
      p.id.toLowerCase().includes(q);
    const matchesType = typeFilter === '' || p.propertyType === typeFilter;
    const matchesConn = connFilter === '' || p.connectionStatus === connFilter;
    const matchesZone = zoneFilter === '' || p.zoneId === zoneFilter;
    return matchesSearch && matchesType && matchesConn && matchesZone;
  }), [properties, search, typeFilter, connFilter, zoneFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleNewProperty = (data?: Record<string, string>) => {
    if (data) {
      fetchProperties();
    }
    setShowForm(false);
  };

  const handleToggleStatus = async () => {
    if (!toDeactivate) return;
    try {
      if (toDeactivate.status === 'active') {
        await propertiesApi.deactivate(toDeactivate.id);
      } else {
        await propertiesApi.activate(toDeactivate.id);
      }
      fetchProperties();
    } catch {
      // silently ignore — UI stays unchanged on error
    } finally {
      setToDeactivate(null);
    }
  };

  const ConnStatusBadge = ({ status }: { status: PropertyConnectionStatus }) => {
    const cfg = CONN_STATUS_CONFIG[status];
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.className)}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  const columns: Column<Property>[] = [
    {
      key: 'id', header: 'Property',
      render: (r) => (
        <div>
          <p className="text-xs font-mono text-primary-600">{r.plotNumber ?? r.id}</p>
          {r.unitNumber && <p className="text-xs text-gray-400">Unit {r.unitNumber}</p>}
        </div>
      ),
    },
    {
      key: 'address', header: 'Address',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{r.address}</p>
          {r.zoneName && <p className="text-xs text-gray-400">{r.zoneName}</p>}
        </div>
      ),
    },
    {
      key: 'propertyType', header: 'Type',
      render: (r) => <span className={cn('badge', PROPERTY_TYPE_BADGE[r.propertyType])}>{PROPERTY_TYPE_LABELS[r.propertyType]}</span>,
    },
    {
      key: 'customerName', header: 'Owner',
      render: (r) => (
        <div>
          <p className="text-sm text-gray-900">{r.customerName ?? '—'}</p>
          {r.occupantName && r.occupantName !== r.customerName && (
            <p className="text-xs text-gray-400">Occ: {r.occupantName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'connectionStatus', header: 'Connection',
      render: (r) => <ConnStatusBadge status={r.connectionStatus} />,
    },
    { key: 'status', header: 'Status', render: (r) => <Badge label={r.status} /> },
    { key: 'createdAt', header: 'Registered', render: (r) => <span className="text-sm text-gray-600">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            title="View property"
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/properties/${r.id}`); }}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            title={r.status === 'active' ? 'Deactivate' : 'Activate'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              r.status === 'active'
                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            )}
            onClick={(e) => { e.stopPropagation(); setToDeactivate(r); }}
          >
            <Building2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-0.5">{properties.length} total · {filtered.length} shown</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Register Property
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',        value: properties.length,                                            color: 'text-gray-900' },
          { label: 'Connected',    value: properties.filter((p) => p.connectionStatus === 'connected').length,    color: 'text-green-600' },
          { label: 'Not Connected',value: properties.filter((p) => p.connectionStatus === 'not_connected').length, color: 'text-gray-500' },
          { label: 'Disconnected', value: properties.filter((p) => p.connectionStatus === 'disconnected').length, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input-base w-44 text-sm" value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as PropertyType | ''); setPage(1); }}>
          <option value="">All Types</option>
          {(Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select className="input-base w-44 text-sm" value={connFilter}
          onChange={(e) => { setConnFilter(e.target.value as PropertyConnectionStatus | ''); setPage(1); }}>
          <option value="">All Connection Statuses</option>
          <option value="connected">Connected</option>
          <option value="not_connected">Not Connected</option>
          <option value="disconnected">Disconnected</option>
        </select>
        <select className="input-base w-48 text-sm" value={zoneFilter}
          onChange={(e) => { setZoneFilter(e.target.value); setPage(1); }}>
          <option value="">All Zones</option>
          {zoneOptions.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by address, plot number, owner…"
        onRowClick={(r) => navigate(`/properties/${r.id}`)}
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Register Property" size="lg">
        <PropertyForm onSuccess={handleNewProperty} onCancel={() => setShowForm(false)} />
      </Modal>

      <ConfirmDialog
        open={!!toDeactivate}
        onClose={() => setToDeactivate(null)}
        onConfirm={handleToggleStatus}
        title={toDeactivate?.status === 'active' ? 'Deactivate Property' : 'Activate Property'}
        message={
          toDeactivate?.status === 'active'
            ? `Deactivating ${toDeactivate?.address} will mark it as inactive. Existing connections are not affected.`
            : `Reactivating ${toDeactivate?.address} will restore it to active status.`
        }
        confirmLabel={toDeactivate?.status === 'active' ? 'Deactivate' : 'Activate'}
        confirmVariant={toDeactivate?.status === 'active' ? 'danger' : 'primary'}
      />
    </div>
  );
};
