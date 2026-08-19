import { useState, useMemo, useEffect } from 'react';
import { Package, Wrench, Settings2, AlertTriangle, CheckCircle2, Clock, PlusCircle, TrendingDown, BarChart2, Archive } from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input, Select } from '@/shared/components/ui/Input';
import { inventoryApi, assetsApi, maintenanceApi } from '@/features/inventory/api/inventory';
import { formatCurrency, formatDate } from '@/shared/utils/utils';
import type { Asset, AssetCategory, AssetCondition, AssetStatus, InventoryItem, MaintenanceRecord, MaintenanceStatus, MaintenanceType } from '@/types';

type Tab = 'assets' | 'stock' | 'maintenance';

// ─── Badge helpers ────────────────────────────────────────────────────────────
const conditionBadge: Record<AssetCondition, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
  excellent:      { label: 'Excellent',      variant: 'green'  },
  good:           { label: 'Good',           variant: 'blue'   },
  fair:           { label: 'Fair',           variant: 'yellow' },
  poor:           { label: 'Poor',           variant: 'red'    },
  decommissioned: { label: 'Decommissioned', variant: 'gray'   },
};

const statusBadge: Record<AssetStatus, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }> = {
  active:            { label: 'Active',            variant: 'green'  },
  in_stock:          { label: 'In Stock',          variant: 'blue'   },
  under_maintenance: { label: 'Under Maintenance', variant: 'yellow' },
  decommissioned:    { label: 'Decommissioned',    variant: 'gray'   },
  lost:              { label: 'Lost',              variant: 'red'    },
};

const maintStatusBadge: Record<MaintenanceStatus, { label: string; variant: 'green' | 'blue' | 'yellow' | 'gray' }> = {
  scheduled:   { label: 'Scheduled',   variant: 'blue'   },
  in_progress: { label: 'In Progress', variant: 'yellow' },
  completed:   { label: 'Completed',   variant: 'green'  },
  cancelled:   { label: 'Cancelled',   variant: 'gray'   },
};

const maintTypeBadge: Record<MaintenanceType, { label: string; variant: 'green' | 'blue' | 'yellow' | 'purple' | 'gray' }> = {
  preventive:   { label: 'Preventive',   variant: 'blue'   },
  corrective:   { label: 'Corrective',   variant: 'yellow' },
  inspection:   { label: 'Inspection',   variant: 'purple' },
  upgrade:      { label: 'Upgrade',      variant: 'green'  },
  decommission: { label: 'Decommission', variant: 'gray'   },
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  water_meter:     'Water Meter',
  pipe:            'Pipe',
  valve:           'Valve',
  pump:            'Pump',
  tank:            'Tank',
  pressure_sensor: 'Pressure Sensor',
  iot_device:      'IoT Device',
  meter_box:       'Meter Box',
  fitting:         'Fitting',
  other:           'Other',
};

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v })),
];

const ASSET_STATUS_OPTIONS = [
  { value: 'all',              label: 'All Statuses' },
  { value: 'active',           label: 'Active' },
  { value: 'in_stock',         label: 'In Stock' },
  { value: 'under_maintenance',label: 'Under Maintenance' },
  { value: 'decommissioned',   label: 'Decommissioned' },
  { value: 'lost',             label: 'Lost' },
];

const MAINT_STATUS_OPTIONS = [
  { value: 'all',        label: 'All Statuses' },
  { value: 'scheduled',  label: 'Scheduled' },
  { value: 'in_progress',label: 'In Progress' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
];

const MAINT_TYPE_OPTIONS = [
  { value: 'preventive',   label: 'Preventive' },
  { value: 'corrective',   label: 'Corrective' },
  { value: 'inspection',   label: 'Inspection' },
  { value: 'upgrade',      label: 'Upgrade' },
  { value: 'decommission', label: 'Decommission' },
];

// ─── Column definitions ────────────────────────────────────────────────────────
const assetColumns: Column<Asset>[] = [
  { key: 'assetNumber', header: 'Asset No.',  render: a => <span className="font-mono text-xs">{a.assetNumber}</span> },
  { key: 'name',        header: 'Name',       render: a => <span className="font-medium text-sm">{a.name}</span> },
  { key: 'category',   header: 'Category',   render: a => <span className="text-sm text-gray-600">{CATEGORY_LABELS[a.category]}</span> },
  { key: 'location',   header: 'Location',   render: a => <span className="text-xs text-gray-500 max-w-[180px] block truncate">{a.location ?? '—'}</span> },
  { key: 'condition',  header: 'Condition',  render: a => { const c = conditionBadge[a.condition]; return <Badge label={c.label} variant={c.variant} />; } },
  { key: 'status',     header: 'Status',     render: a => { const s = statusBadge[a.status];       return <Badge label={s.label} variant={s.variant} />; } },
  { key: 'nextMaint',  header: 'Next Maint.', render: a => a.nextMaintenanceDate
    ? <span className="text-xs text-gray-500">{formatDate(a.nextMaintenanceDate)}</span>
    : <span className="text-xs text-gray-400">—</span>
  },
];

const stockColumns: Column<InventoryItem>[] = [
  { key: 'itemCode', header: 'Item Code',  render: i => <span className="font-mono text-xs">{i.itemCode}</span> },
  { key: 'name',     header: 'Item Name',  render: i => (
    <div>
      <p className="font-medium text-sm">{i.name}</p>
      {i.description && <p className="text-xs text-gray-400 mt-0.5">{i.description}</p>}
    </div>
  ) },
  { key: 'category', header: 'Category',   render: i => <span className="text-sm text-gray-600 capitalize">{i.category.replace('_', ' ')}</span> },
  { key: 'inStock',  header: 'In Stock',   render: i => {
    const low = i.quantityInStock <= i.minimumStock;
    return (
      <span className={`font-semibold text-sm ${low ? 'text-red-600' : 'text-gray-800'}`}>
        {i.quantityInStock} {i.unit}
        {low && <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-red-500" />}
      </span>
    );
  } },
  { key: 'installed', header: 'Installed',  render: i => <span className="text-sm text-gray-600">{i.quantityInstalled} {i.unit}</span> },
  { key: 'minStock',  header: 'Min Stock',  render: i => <span className="text-sm text-gray-500">{i.minimumStock} {i.unit}</span> },
  { key: 'value',     header: 'Stock Value', render: i => <span className="text-sm font-medium">{i.totalValue ? formatCurrency(i.totalValue) : '—'}</span> },
  { key: 'location',  header: 'Location',   render: i => <span className="text-xs text-gray-500">{i.warehouseLocation ?? '—'}</span> },
];

const maintColumns: Column<MaintenanceRecord>[] = [
  { key: 'asset', header: 'Asset', render: m => (
    <div>
      <p className="font-mono text-xs">{m.assetNumber}</p>
      <p className="text-sm font-medium text-gray-700">{m.assetName}</p>
    </div>
  ) },
  { key: 'type',        header: 'Type',        render: m => { const t = maintTypeBadge[m.maintenanceType]; return <Badge label={t.label} variant={t.variant} />; } },
  { key: 'description', header: 'Description', render: m => <p className="text-xs text-gray-600 max-w-[280px] line-clamp-2">{m.description}</p> },
  { key: 'scheduledDate', header: 'Scheduled', render: m => <span className="text-sm">{formatDate(m.scheduledDate)}</span> },
  { key: 'performedBy',  header: 'Performed By', render: m => <span className="text-sm text-gray-600">{m.performedBy ?? '—'}</span> },
  { key: 'cost',        header: 'Cost',        render: m => <span className="text-sm">{m.cost != null ? formatCurrency(m.cost) : '—'}</span> },
  { key: 'status',      header: 'Status',      render: m => { const s = maintStatusBadge[m.status]; return <Badge label={s.label} variant={s.variant} />; } },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export const Inventory = () => {
  const [tab, setTab]                         = useState<Tab>('assets');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('all');
  const [assetStatusFilter, setAssetStatusFilter]     = useState('all');
  const [maintStatusFilter, setMaintStatusFilter]     = useState('all');
  const [showAddAssetModal, setShowAddAssetModal]     = useState(false);
  const [showRestockModal, setShowRestockModal]       = useState<InventoryItem | null>(null);
  const [showMaintModal, setShowMaintModal]           = useState(false);
  const [selectedAsset, setSelectedAsset]             = useState<Asset | null>(null);

  // ─── API data state ─────────────────────────────────────────────────────────
  const [assets, setAssets]                   = useState<Asset[]>([]);
  const [inventoryItems, setInventoryItems]   = useState<InventoryItem[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loadingAssets, setLoadingAssets]     = useState(false);
  const [loadingStock, setLoadingStock]       = useState(false);
  const [loadingMaint, setLoadingMaint]       = useState(false);

  // ─── Fetch data per tab ─────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'assets') {
      setLoadingAssets(true);
      assetsApi.list({ pageSize: 200 })
        .then(res => setAssets(res.data))
        .catch(() => {})
        .finally(() => setLoadingAssets(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'stock') {
      setLoadingStock(true);
      inventoryApi.list({ pageSize: 200 })
        .then(res => setInventoryItems(res.data))
        .catch(() => {})
        .finally(() => setLoadingStock(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'maintenance') {
      setLoadingMaint(true);
      maintenanceApi.list({ pageSize: 200 })
        .then(res => setMaintenanceRecords(res.data))
        .catch(() => {})
        .finally(() => setLoadingMaint(false));
    }
  }, [tab]);

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const assetStats = useMemo(() => ({
    total:          assets.length,
    active:         assets.filter(a => a.status === 'active').length,
    underMaint:     assets.filter(a => a.status === 'under_maintenance').length,
    decommissioned: assets.filter(a => a.status === 'decommissioned').length,
  }), [assets]);

  const totalInventoryValue = useMemo(() =>
    inventoryItems.reduce((s, i) => s + (i.totalValue ?? 0), 0), [inventoryItems]);

  const lowStockCount = inventoryItems.filter(i => i.quantityInStock <= i.minimumStock).length;

  const maintStats = useMemo(() => ({
    scheduled:  maintenanceRecords.filter(m => m.status === 'scheduled').length,
    inProgress: maintenanceRecords.filter(m => m.status === 'in_progress').length,
    completed:  maintenanceRecords.filter(m => m.status === 'completed').length,
    totalCost:  maintenanceRecords.filter(m => m.status === 'completed').reduce((s, m) => s + (m.cost ?? 0), 0),
  }), [maintenanceRecords]);

  // ─── Filtered data ──────────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => assets.filter(a => {
    if (assetCategoryFilter !== 'all' && a.category !== assetCategoryFilter) return false;
    if (assetStatusFilter   !== 'all' && a.status   !== assetStatusFilter)   return false;
    return true;
  }), [assets, assetCategoryFilter, assetStatusFilter]);

  const filteredMaint = useMemo(() => maintenanceRecords.filter(m =>
    maintStatusFilter === 'all' || m.status === maintStatusFilter
  ), [maintenanceRecords, maintStatusFilter]);

  // ─── Asset options for maintenance modal ────────────────────────────────────
  const assetOptions = useMemo(() => [
    { value: '', label: 'Select asset…' },
    ...assets
      .filter(a => a.status !== 'decommissioned')
      .map(a => ({ value: a.id, label: `${a.assetNumber} — ${a.name}` })),
  ], [assets]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'assets',      label: 'Assets',      icon: <Settings2 className="w-4 h-4" /> },
    { key: 'stock',       label: 'Stock',        icon: <Package   className="w-4 h-4" /> },
    { key: 'maintenance', label: 'Maintenance',  icon: <Wrench    className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory & Assets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track infrastructure assets, stock levels and maintenance schedules</p>
        </div>
        <div className="flex gap-2">
          {tab === 'assets' && (
            <button onClick={() => setShowAddAssetModal(true)} className="btn-primary flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Add Asset
            </button>
          )}
          {tab === 'stock' && (
            <button onClick={() => setShowRestockModal(inventoryItems[0] ?? null)} className="btn-primary flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Restock Item
            </button>
          )}
          {tab === 'maintenance' && (
            <button onClick={() => setShowMaintModal(true)} className="btn-primary flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Schedule Maintenance
            </button>
          )}
        </div>
      </div>

      {/* Summary cards — per tab */}
      {tab === 'assets' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Assets',      value: String(assetStats.total),          icon: <Archive className="w-5 h-5 text-blue-500" />,        bg: 'bg-blue-50'   },
            { label: 'Active',            value: String(assetStats.active),         icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,  bg: 'bg-green-50'  },
            { label: 'Under Maintenance', value: String(assetStats.underMaint),     icon: <Wrench className="w-5 h-5 text-yellow-500" />,       bg: 'bg-yellow-50' },
            { label: 'Decommissioned',    value: String(assetStats.decommissioned), icon: <AlertTriangle className="w-5 h-5 text-gray-500" />,  bg: 'bg-gray-50'   },
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
      )}

      {tab === 'stock' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Items',   value: String(inventoryItems.length), icon: <Package className="w-5 h-5 text-blue-500" />,       bg: 'bg-blue-50'   },
            { label: 'Low Stock',     value: String(lowStockCount),             icon: <TrendingDown className="w-5 h-5 text-red-500" />,    bg: 'bg-red-50'    },
            { label: 'Stock Value',   value: formatCurrency(totalInventoryValue), icon: <BarChart2 className="w-5 h-5 text-green-500" />,  bg: 'bg-green-50'  },
            { label: 'Meter Types',   value: String(inventoryItems.filter(i => i.category === 'meters').length), icon: <Settings2 className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50' },
          ].map(c => (
            <div key={c.label} className="card p-4 flex items-center gap-4">
              <div className={`${c.bg} p-3 rounded-xl`}>{c.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="font-bold text-gray-900 text-xl leading-tight">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Scheduled',        value: String(maintStats.scheduled),  icon: <Clock className="w-5 h-5 text-blue-500" />,        bg: 'bg-blue-50'   },
            { label: 'In Progress',      value: String(maintStats.inProgress), icon: <Wrench className="w-5 h-5 text-yellow-500" />,     bg: 'bg-yellow-50' },
            { label: 'Completed',        value: String(maintStats.completed),  icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,bg: 'bg-green-50'  },
            { label: 'Total Cost (YTD)', value: formatCurrency(maintStats.totalCost), icon: <BarChart2 className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50' },
          ].map(c => (
            <div key={c.label} className="card p-4 flex items-center gap-4">
              <div className={`${c.bg} p-3 rounded-xl`}>{c.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="font-bold text-gray-900 text-xl leading-tight">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* ── Assets tab ─────────────────────────────────────────────────────────── */}
      {tab === 'assets' && (
        <DataTable
          columns={assetColumns}
          data={filteredAssets}
          loading={loadingAssets}
          rowKey={a => a.id}
          onRowClick={a => setSelectedAsset(a)}
          onSearch={() => {}}
          actions={
            <div className="flex gap-2">
              <Select
                options={CATEGORY_OPTIONS}
                value={assetCategoryFilter}
                onChange={e => setAssetCategoryFilter(e.target.value)}
              />
              <Select
                options={ASSET_STATUS_OPTIONS}
                value={assetStatusFilter}
                onChange={e => setAssetStatusFilter(e.target.value)}
              />
            </div>
          }
        />
      )}

      {/* ── Stock tab ──────────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">
                <strong>{lowStockCount} item{lowStockCount > 1 ? 's are' : ' is'} at or below minimum stock level</strong> — reorder action required.
              </p>
            </div>
          )}
          <DataTable
            columns={stockColumns}
            data={inventoryItems}
            loading={loadingStock}
            rowKey={i => i.id}
            onRowClick={i => setShowRestockModal(i)}
            onSearch={() => {}}
          />
        </div>
      )}

      {/* ── Maintenance tab ────────────────────────────────────────────────────── */}
      {tab === 'maintenance' && (
        <DataTable
          columns={maintColumns}
          data={filteredMaint}
          loading={loadingMaint}
          rowKey={m => m.id}
          onSearch={() => {}}
          actions={
            <Select
              options={MAINT_STATUS_OPTIONS}
              value={maintStatusFilter}
              onChange={e => setMaintStatusFilter(e.target.value)}
            />
          }
        />
      )}

      {/* ── Asset Detail Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset?.name ?? ''}
        size="lg"
      >
        {selectedAsset && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge label={conditionBadge[selectedAsset.condition].label} variant={conditionBadge[selectedAsset.condition].variant} />
              <Badge label={statusBadge[selectedAsset.status].label}       variant={statusBadge[selectedAsset.status].variant}       />
              <Badge label={CATEGORY_LABELS[selectedAsset.category]} variant="blue" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {(
                [
                  ['Asset Number',    selectedAsset.assetNumber],
                  ['Serial No.',      selectedAsset.serialNumber ?? '—'],
                  ['Brand / Model',   `${selectedAsset.brand ?? ''} ${selectedAsset.model ?? ''}`.trim() || '—'],
                  ['Location',        selectedAsset.location ?? '—'],
                  ['Zone',            selectedAsset.zoneName ?? '—'],
                  ['Supplier',        selectedAsset.supplier ?? '—'],
                  ['Purchase Date',   selectedAsset.purchaseDate ? formatDate(selectedAsset.purchaseDate) : '—'],
                  ['Purchase Price',  selectedAsset.purchasePrice ? formatCurrency(selectedAsset.purchasePrice) : '—'],
                  ['Warranty Expiry', selectedAsset.warrantyExpiry ? formatDate(selectedAsset.warrantyExpiry) : '—'],
                  ['Last Maint.',     selectedAsset.lastMaintenanceDate ? formatDate(selectedAsset.lastMaintenanceDate) : '—'],
                  ['Next Maint.',     selectedAsset.nextMaintenanceDate ? formatDate(selectedAsset.nextMaintenanceDate) : '—'],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-medium text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            {selectedAsset.specifications && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Specifications</p>
                <p className="text-sm text-gray-700">{selectedAsset.specifications}</p>
              </div>
            )}
            {selectedAsset.notes && (
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-600 mb-1">Notes</p>
                <p className="text-sm text-amber-800">{selectedAsset.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Add Asset Modal ────────────────────────────────────────────────────── */}
      <Modal
        open={showAddAssetModal}
        onClose={() => setShowAddAssetModal(false)}
        title="Add New Asset"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowAddAssetModal(false)}>Cancel</button>
            <button className="btn-primary"   onClick={() => setShowAddAssetModal(false)}>Save Asset</button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Asset Name *"       placeholder="e.g. Elster V100 Water Meter" />
          <Select
            label="Category *"
            options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Input label="Brand"              placeholder="e.g. Elster" />
          <Input label="Model"              placeholder="e.g. V100-DN15" />
          <Input label="Serial No."         placeholder="Unique serial number" />
          <Input label="Location"           placeholder="Physical location" />
          <Input label="Purchase Date"      type="date" />
          <Input label="Purchase Price (KES)" type="number" placeholder="0.00" />
          <Input label="Supplier"           placeholder="Supplier name" />
          <Input label="Warranty Expiry"    type="date" />
          <div className="col-span-2">
            <Input label="Specifications"   placeholder="Technical specifications…" />
          </div>
        </div>
      </Modal>

      {/* ── Restock Modal ──────────────────────────────────────────────────────── */}
      <Modal
        open={!!showRestockModal}
        onClose={() => setShowRestockModal(null)}
        title={showRestockModal ? `Restock: ${showRestockModal.name}` : ''}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowRestockModal(null)}>Cancel</button>
            <button className="btn-primary"   onClick={() => setShowRestockModal(null)}>Confirm Restock</button>
          </div>
        }
      >
        {showRestockModal && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 space-y-1">
              <p>Current stock: <strong>{showRestockModal.quantityInStock} {showRestockModal.unit}</strong></p>
              <p>Minimum stock: {showRestockModal.minimumStock} {showRestockModal.unit} &nbsp;|&nbsp; Reorder level: {showRestockModal.reorderLevel} {showRestockModal.unit}</p>
            </div>
            <Input label="Quantity to Add *" type="number" placeholder={`e.g. ${showRestockModal.reorderLevel}`} />
            <Input label="Supplier"          defaultValue={showRestockModal.supplier ?? ''} />
            <Input label="Unit Cost (KES)"   type="number" placeholder={String(showRestockModal.unitCost ?? '')} />
            <Input label="Delivery Date"     type="date" />
            <Input label="Reference / LPO No." placeholder="Purchase order reference" />
          </div>
        )}
      </Modal>

      {/* ── Schedule Maintenance Modal ─────────────────────────────────────────── */}
      <Modal
        open={showMaintModal}
        onClose={() => setShowMaintModal(false)}
        title="Schedule Maintenance"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowMaintModal(false)}>Cancel</button>
            <button className="btn-primary"   onClick={() => setShowMaintModal(false)}>Schedule</button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select label="Asset *"            options={assetOptions} />
          <Select label="Maintenance Type *" options={MAINT_TYPE_OPTIONS} />
          <Input  label="Scheduled Date *"   type="date" />
          <Input  label="Assigned To"        placeholder="Technician or team name" />
          <Input  label="Estimated Cost (KES)" type="number" placeholder="0.00" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              rows={3}
              className="input-base w-full resize-none"
              placeholder="Describe the maintenance work to be performed…"
            />
          </div>
          <Input label="Notes" placeholder="Any additional notes or coordination required" />
        </div>
      </Modal>
    </div>
  );
};
