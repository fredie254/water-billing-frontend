import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Eye, Wifi, Wrench, AlertTriangle, Clock, CheckCircle2,
  History, MapPin, ChevronDown, TriangleAlert, ShieldAlert,
} from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Modal } from '@/shared/components/ui/Modal';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { Input, Select, Textarea } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { metersApi } from '@/features/meters/api/meters';
import { formatDate, formatDateTime, cn } from '@/shared/utils/utils';
import type { Meter, MeterStatus, MeterType, MeterEvent, MeterEventType } from '@/types';

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MeterStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  active:       { label: 'Active',       badge: 'badge-green',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  inactive:     { label: 'Inactive',     badge: 'badge-gray',   icon: <Clock       className="w-3.5 h-3.5" /> },
  faulty:       { label: 'Faulty',       badge: 'badge-red',    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  replaced:     { label: 'Replaced',     badge: 'badge-yellow', icon: <Wrench      className="w-3.5 h-3.5" /> },
  removed:      { label: 'Removed',      badge: 'badge-gray',   icon: <Wrench      className="w-3.5 h-3.5" /> },
  tampered:     { label: 'Tampered',     badge: 'badge-red',    icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  disconnected: { label: 'Disconnected', badge: 'badge-yellow', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const EVENT_TYPE_CONFIG: Record<MeterEventType, { label: string; color: string }> = {
  installation:        { label: 'Installation',       color: 'text-green-700 bg-green-50' },
  reading:             { label: 'Reading',            color: 'text-blue-700 bg-blue-50' },
  calibration:         { label: 'Calibration',        color: 'text-purple-700 bg-purple-50' },
  inspection:          { label: 'Inspection',         color: 'text-teal-700 bg-teal-50' },
  replacement:         { label: 'Replacement',        color: 'text-yellow-700 bg-yellow-50' },
  removal:             { label: 'Removal',            color: 'text-gray-700 bg-gray-100' },
  fault_reported:      { label: 'Fault Reported',     color: 'text-red-700 bg-red-50' },
  tampering_detected:  { label: 'Tampering',          color: 'text-red-700 bg-red-100' },
  repair:              { label: 'Repair',             color: 'text-orange-700 bg-orange-50' },
  status_change:       { label: 'Status Change',      color: 'text-gray-700 bg-gray-100' },
  note:                { label: 'Note',               color: 'text-gray-700 bg-gray-50' },
};

// ─── schemas ─────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  meterNumber:          z.string().optional(),
  serialNumber:         z.string().min(3, 'Serial number is required'),
  brand:                z.string().optional(),
  model:                z.string().optional(),
  type:                 z.enum(['mechanical', 'digital', 'smart_iot']),
  size:                 z.string().optional(),
  propertyId:           z.string().optional(),
  customerId:           z.string().optional(),
  installationLocation: z.string().optional(),
  initialReading:       z.number().min(0),
  notes:                z.string().optional(),
});
type RegisterForm = z.infer<typeof registerSchema>;

const eventSchema = z.object({
  eventType:    z.enum(['calibration', 'inspection', 'fault_reported', 'tampering_detected', 'removal', 'note']),
  description:  z.string().min(5, 'Description is required'),
  performedBy:  z.string().optional(),
  notes:        z.string().optional(),
});
type EventForm = z.infer<typeof eventSchema>;

const assignSchema = z.object({
  propertyId:           z.string().min(1, 'Select a property'),
  customerId:           z.string().optional(),
  installationLocation: z.string().optional(),
});
type AssignForm = z.infer<typeof assignSchema>;

// ─── component ───────────────────────────────────────────────────────────────

export const Meters = () => {
  const [meters,       setMeters]       = useState<Meter[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [events,       setEvents]       = useState<MeterEvent[]>([]);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<MeterStatus | ''>('');
  const [typeFilter,   setTypeFilter]   = useState<MeterType | ''>('');
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 10;

  const [showRegister,    setShowRegister]    = useState(false);
  const [historyMeter,    setHistoryMeter]    = useState<Meter | null>(null);
  const [eventMeter,      setEventMeter]      = useState<Meter | null>(null);
  const [assignMeter,     setAssignMeter]     = useState<Meter | null>(null);
  const [confirmRemove,   setConfirmRemove]   = useState<Meter | null>(null);
  const [openActionMenu,  setOpenActionMenu]  = useState<string | null>(null);

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { type: 'digital', initialReading: 0 },
  });
  const eventForm = useForm<EventForm>({ resolver: zodResolver(eventSchema) });
  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) });

  // ── data fetching ──────────────────────────────────────────────────────────

  const fetchMeters = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter)   params.type   = typeFilter;

      const result = await metersApi.list(params);
      setMeters(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      console.error('Failed to fetch meters:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchMeters();
  }, [fetchMeters]);

  // ── meter history ──────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async (meter: Meter) => {
    setHistoryMeter(meter);
    try {
      const result = await metersApi.getOne(meter.id);
      // If the API returns events embedded on the meter, use them; otherwise keep local events
      if ((result as any).events) {
        setEvents((result as any).events);
      }
    } catch (err) {
      console.error('Failed to fetch meter history:', err);
    }
  }, []);

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleRegister = async (data: RegisterForm) => {
    await metersApi.create(data as Partial<Meter>);
    registerForm.reset({ type: 'digital', initialReading: 0 });
    setShowRegister(false);
    fetchMeters();
  };

  const handleLogEvent = async (data: EventForm) => {
    if (!eventMeter) return;
    // Map the event form to an update call that changes the meter status/dates
    const updates: Partial<Meter> = {};
    if (data.eventType === 'tampering_detected') {
      updates.status = 'tampered';
    } else if (data.eventType === 'removal') {
      updates.status = 'removed';
    } else if (data.eventType === 'fault_reported') {
      updates.status = 'faulty';
    } else if (data.eventType === 'inspection') {
      updates.inspectionDate = new Date().toISOString();
    } else if (data.eventType === 'calibration') {
      updates.calibrationDate = new Date().toISOString();
    }

    await metersApi.update(eventMeter.id, {
      ...updates,
      // Pass event data as extra fields for the backend to record
      _event: {
        eventType: data.eventType,
        description: data.description,
        performedBy: data.performedBy,
        notes: data.notes,
      },
    } as Partial<Meter>);

    // Optimistically add to local event log for the history modal
    const newEvent: MeterEvent = {
      id: `me${Date.now()}`, tenantId: 't1', meterId: eventMeter.id,
      eventType: data.eventType as MeterEventType, description: data.description,
      performedBy: data.performedBy, notes: data.notes, createdAt: new Date().toISOString(),
    };
    setEvents((prev) => [newEvent, ...prev]);

    eventForm.reset();
    setEventMeter(null);
    fetchMeters();
  };

  const handleAssign = async (data: AssignForm) => {
    if (!assignMeter) return;
    await metersApi.update(assignMeter.id, {
      propertyId:           data.propertyId,
      customerId:           data.customerId,
      installationLocation: data.installationLocation,
    });
    assignForm.reset();
    setAssignMeter(null);
    fetchMeters();
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    await metersApi.retire(confirmRemove.id);
    setConfirmRemove(null);
    fetchMeters();
  };

  // ── local-only event for history modal ────────────────────────────────────

  const meterHistory = historyMeter
    ? events.filter((e) => e.meterId === historyMeter.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  // ── status counts derived from current page; for accurate counts the API
  //    would need to return aggregates — use what we have ────────────────────

  const StatusBadge = ({ status }: { status: MeterStatus }) => {
    const cfg = STATUS_CONFIG[status];
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.badge)}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  const columns: Column<Meter>[] = [
    {
      key: 'meterNumber', header: 'Meter #',
      render: (r) => (
        <div>
          <p className="text-xs font-mono font-medium text-gray-900">{r.meterNumber ?? '—'}</p>
          <p className="text-[10px] text-gray-400">{r.serialNumber}</p>
        </div>
      ),
    },
    {
      key: 'type', header: 'Type',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.type === 'smart_iot' && <Wifi className="w-3.5 h-3.5 text-blue-500" />}
          <span className="text-sm capitalize">{r.type.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      key: 'brand', header: 'Brand / Model',
      render: (r) => <span className="text-sm">{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</span>,
    },
    { key: 'size', header: 'Size', render: (r) => <span className="text-sm">{r.size ?? '—'}</span> },
    {
      key: 'propertyAddress', header: 'Property / Owner',
      render: (r) => r.propertyAddress ? (
        <div>
          <p className="text-sm text-gray-900 truncate max-w-[180px]">{r.propertyAddress}</p>
          {r.customerName && <p className="text-xs text-gray-400">{r.customerName}</p>}
        </div>
      ) : <span className="text-gray-400 text-sm">Unassigned</span>,
    },
    {
      key: 'lastReading', header: 'Last Reading',
      render: (r) => r.lastReading != null ? (
        <div>
          <p className="text-sm font-medium">{r.lastReading.toFixed(1)} m³</p>
          {r.lastReadingDate && <p className="text-[10px] text-gray-400">{formatDate(r.lastReadingDate)}</p>}
        </div>
      ) : <span className="text-gray-400 text-sm">—</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="relative flex items-center gap-1">
          <button
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="View history"
            onClick={(e) => { e.stopPropagation(); fetchHistory(r); }}
          >
            <History className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-0.5"
              onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}
            >
              <span className="text-xs">Actions</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {openActionMenu === r.id && (
              <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1" onClick={(e) => e.stopPropagation()}>
                {[
                  { label: 'Assign to Property', icon: <MapPin className="w-3.5 h-3.5" />, action: () => { setAssignMeter(r); setOpenActionMenu(null); } },
                  { label: 'Log Inspection',     icon: <Eye    className="w-3.5 h-3.5" />, action: () => { eventForm.reset({ eventType: 'inspection' }); setEventMeter(r); setOpenActionMenu(null); } },
                  { label: 'Log Calibration',    icon: <Wrench className="w-3.5 h-3.5" />, action: () => { eventForm.reset({ eventType: 'calibration' }); setEventMeter(r); setOpenActionMenu(null); } },
                  { label: 'Report Fault',       icon: <AlertTriangle className="w-3.5 h-3.5" />, action: () => { eventForm.reset({ eventType: 'fault_reported' }); setEventMeter(r); setOpenActionMenu(null); } },
                  { label: 'Report Tampering',   icon: <ShieldAlert className="w-3.5 h-3.5" />, action: () => { eventForm.reset({ eventType: 'tampering_detected' }); setEventMeter(r); setOpenActionMenu(null); } },
                  { label: 'Add Note',           icon: <Plus   className="w-3.5 h-3.5" />, action: () => { eventForm.reset({ eventType: 'note' }); setEventMeter(r); setOpenActionMenu(null); } },
                  { label: 'Remove Meter',       icon: <TriangleAlert className="w-3.5 h-3.5" />, action: () => { setConfirmRemove(r); setOpenActionMenu(null); }, danger: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                      item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                    )}
                    onClick={item.action}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  // Close action menus on outside click
  const handleOverlayClick = () => setOpenActionMenu(null);

  return (
    <div className="space-y-6" onClick={handleOverlayClick}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meters</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} registered · {meters.length} shown</p>
        </div>
        <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setShowRegister(true); }}>
          <Plus className="w-4 h-4" /> Register Meter
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {(Object.entries(STATUS_CONFIG) as [MeterStatus, typeof STATUS_CONFIG[MeterStatus]][]).map(([s, cfg]) => {
          const count = meters.filter((m) => m.status === s).length;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
              className={cn(
                'card p-3 text-center cursor-pointer hover:shadow-md transition-all',
                statusFilter === s ? 'ring-2 ring-primary-500' : ''
              )}
            >
              <p className={cn('text-lg font-bold', s === 'active' ? 'text-green-600' : s === 'faulty' || s === 'tampered' ? 'text-red-600' : 'text-gray-700')}>{count}</p>
              <p className="text-[10px] text-gray-500">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input-base w-40 text-sm" value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as MeterType | ''); setPage(1); }}>
          <option value="">All Types</option>
          <option value="mechanical">Mechanical</option>
          <option value="digital">Digital / AMR</option>
          <option value="smart_iot">Smart / IoT</option>
        </select>
        <select className="input-base w-44 text-sm" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as MeterStatus | ''); setPage(1); }}>
          <option value="">All Statuses</option>
          {(Object.entries(STATUS_CONFIG) as [MeterStatus, typeof STATUS_CONFIG[MeterStatus]][]).map(([s, cfg]) => (
            <option key={s} value={s}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        data={meters}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search serial, meter #, brand, customer, property…"
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {/* ── Register Meter Modal ──────────────────────────────────────────────── */}
      <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Register New Meter" size="lg">
        <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Meter Number / Barcode" {...registerForm.register('meterNumber')} placeholder="MTR-001" />
            <Input label="Serial Number *" {...registerForm.register('serialNumber')} error={registerForm.formState.errors.serialNumber?.message} placeholder="KW-001-2024" />
            <Input label="Brand" {...registerForm.register('brand')} placeholder="Itron, Sensus…" />
            <Input label="Model" {...registerForm.register('model')} placeholder="EverBlu" />
            <Select label="Meter Type *" {...registerForm.register('type')} options={[
              { value: 'mechanical', label: 'Mechanical' },
              { value: 'digital',    label: 'Digital / AMR' },
              { value: 'smart_iot', label: 'Smart / AMI / IoT' },
            ]} />
            <Select label="Pipe Size" {...registerForm.register('size')} placeholder="Select size" options={[
              { value: '15mm', label: '15mm (½")' }, { value: '20mm', label: '20mm (¾")' },
              { value: '25mm', label: '25mm (1")' }, { value: '40mm', label: '40mm (1½")' },
              { value: '50mm', label: '50mm (2")' }, { value: '80mm', label: '80mm (3")' },
            ]} />
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Property ID" {...registerForm.register('propertyId')} placeholder="Property ID" />
              <Input label="Customer ID" {...registerForm.register('customerId')} placeholder="Customer ID" />
            </div>
            <Input label="Installation Location" {...registerForm.register('installationLocation')} placeholder="e.g. External meter box, front gate" />
          </div>
          <Input label="Initial Reading (m³)" {...registerForm.register('initialReading', { valueAsNumber: true })} type="number" step="0.001" placeholder="0.000" />
          <Textarea label="Notes" {...registerForm.register('notes')} placeholder="Any relevant notes about this meter…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowRegister(false)}>Cancel</Button>
            <Button type="submit" loading={registerForm.formState.isSubmitting}>Register Meter</Button>
          </div>
        </form>
      </Modal>

      {/* ── Meter History Modal ───────────────────────────────────────────────── */}
      <Modal
        open={!!historyMeter}
        onClose={() => setHistoryMeter(null)}
        title={`Meter History — ${historyMeter?.meterNumber ?? historyMeter?.serialNumber}`}
        description={`${historyMeter?.brand ?? ''} ${historyMeter?.model ?? ''} · ${historyMeter?.serialNumber}`}
        size="lg"
      >
        {meterHistory.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No history events recorded.</p>
        ) : (
          <div className="space-y-3">
            {meterHistory.map((ev) => {
              const cfg = EVENT_TYPE_CONFIG[ev.eventType];
              return (
                <div key={ev.id} className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <span className={cn('inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{ev.description}</p>
                    {ev.notes && <p className="text-xs text-gray-500 mt-0.5">{ev.notes}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(ev.createdAt)}
                      {ev.performedBy && ` · ${ev.performedBy}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ── Log Event Modal ───────────────────────────────────────────────────── */}
      <Modal
        open={!!eventMeter}
        onClose={() => setEventMeter(null)}
        title="Log Meter Event"
        description={`${eventMeter?.meterNumber ?? eventMeter?.serialNumber} · ${eventMeter?.serialNumber}`}
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setEventMeter(null)}>Cancel</button>
            <button className="btn-primary" onClick={eventForm.handleSubmit(handleLogEvent)} disabled={eventForm.formState.isSubmitting}>
              {eventForm.formState.isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : 'Save Event'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select label="Event Type" {...eventForm.register('eventType')} error={eventForm.formState.errors.eventType?.message}
            options={[
              { value: 'calibration',        label: 'Calibration' },
              { value: 'inspection',         label: 'Inspection' },
              { value: 'fault_reported',     label: 'Fault Report' },
              { value: 'tampering_detected', label: 'Tampering Detected' },
              { value: 'removal',            label: 'Meter Removal' },
              { value: 'note',               label: 'General Note' },
            ]}
          />
          <Input label="Performed By" {...eventForm.register('performedBy')} placeholder="e.g. John Reader" />
          <Textarea label="Description *" {...eventForm.register('description')} error={eventForm.formState.errors.description?.message} placeholder="Describe what was done or observed…" />
          <Textarea label="Additional Notes" {...eventForm.register('notes')} placeholder="Any other relevant information…" />
        </div>
      </Modal>

      {/* ── Assign to Property Modal ──────────────────────────────────────────── */}
      <Modal
        open={!!assignMeter}
        onClose={() => setAssignMeter(null)}
        title="Assign Meter to Property"
        description={`${assignMeter?.meterNumber ?? assignMeter?.serialNumber}`}
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setAssignMeter(null)}>Cancel</button>
            <button className="btn-primary" onClick={assignForm.handleSubmit(handleAssign)} disabled={assignForm.formState.isSubmitting}>
              {assignForm.formState.isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : 'Assign'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Property ID *"
            {...assignForm.register('propertyId')}
            error={assignForm.formState.errors.propertyId?.message}
            placeholder="Enter property ID"
          />
          <Input label="Customer ID" {...assignForm.register('customerId')} placeholder="Enter customer ID" />
          <Input label="Installation Location" {...assignForm.register('installationLocation')} placeholder="e.g. External meter box, front gate" />
        </div>
      </Modal>

      {/* ── Remove Confirmation ───────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
        title="Remove Meter"
        message={`Remove meter ${confirmRemove?.serialNumber} from service? This will set its status to Removed. The action can be undone by a system administrator.`}
        confirmLabel="Remove Meter"
        confirmVariant="danger"
      />
    </div>
  );
};
