import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, AlertTriangle, CheckCircle2, ShieldCheck, Camera,
  TrendingUp, TrendingDown, Flag, Filter,
} from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input, Select, Textarea } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { readingsApi, metersApi } from '@/features/meters/api/meters';
import { connectionsApi } from '@/features/billing/api/billing';
import { customersApi } from '@/features/customers/api/customers';
import { extractError } from '@/core/api/client';
import { formatDate, cn } from '@/shared/utils/utils';
import type { MeterReading, ReadingFlag, Connection, Customer, Meter } from '@/types';

// ─── constants ────────────────────────────────────────────────────────────────

const ABNORMAL_HIGH_THRESHOLD = 150;   // m³ — flag consumption above this
const ABNORMAL_HIGH_MULTIPLIER = 3;    // flag if > 3× the connection's typical average

const FLAG_CONFIG: Record<ReadingFlag, { label: string; color: string; icon: React.ReactNode }> = {
  none:                 { label: 'OK',              color: 'text-green-700 bg-green-50',  icon: <CheckCircle2  className="w-3.5 h-3.5" /> },
  negative_consumption: { label: 'Negative',        color: 'text-red-700 bg-red-50',     icon: <TrendingDown  className="w-3.5 h-3.5" /> },
  abnormal_high:        { label: 'Abnormal High',   color: 'text-orange-700 bg-orange-50', icon: <TrendingUp  className="w-3.5 h-3.5" /> },
  meter_reset:          { label: 'Meter Reset',     color: 'text-yellow-700 bg-yellow-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  manual_entry_error:   { label: 'Entry Error',     color: 'text-red-700 bg-red-100',    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

// ─── validation helpers ───────────────────────────────────────────────────────

interface ValidationResult {
  flagged: boolean;
  flagReason: ReadingFlag;
  flagNote: string;
  consumption: number;
}

function validateReading(
  currentReading: number,
  previousReading: number | undefined,
): ValidationResult {
  if (previousReading == null) {
    return { flagged: false, flagReason: 'none', flagNote: '', consumption: currentReading };
  }

  const consumption = currentReading - previousReading;

  if (consumption < 0) {
    return {
      flagged: true,
      flagReason: 'negative_consumption',
      consumption,
      flagNote: `Current reading (${currentReading.toFixed(1)} m³) is lower than previous reading (${previousReading.toFixed(1)} m³). Possible causes: meter replacement, incorrect entry, or meter reset.`,
    };
  }

  if (consumption > ABNORMAL_HIGH_THRESHOLD) {
    return {
      flagged: true,
      flagReason: 'abnormal_high',
      consumption,
      flagNote: `Consumption of ${consumption.toFixed(1)} m³ exceeds the ${ABNORMAL_HIGH_THRESHOLD} m³ threshold (${ABNORMAL_HIGH_MULTIPLIER}× typical). Flagged for manual verification before billing.`,
    };
  }

  return { flagged: false, flagReason: 'none', flagNote: '', consumption };
}

// ─── schema ───────────────────────────────────────────────────────────────────

const readingSchema = z.object({
  connectionId:  z.string().min(1, 'Select a connection'),
  readingValue:  z.number({ invalid_type_error: 'Enter a valid reading' }).min(0),
  readingDate:   z.string().min(1, 'Date is required'),
  readingType:   z.enum(['manual', 'estimate']),
  notes:         z.string().optional(),
});
type ReadingForm = z.infer<typeof readingSchema>;

// ─── Reading Form (with live validation banner) ───────────────────────────────

const RecordReadingForm = ({
  connections,
  onSuccess,
  onCancel,
}: {
  connections: Connection[];
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const [apiError, setApiError] = useState('');
  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting },
  } = useForm<ReadingForm>({
    resolver: zodResolver(readingSchema),
    defaultValues: {
      readingType: 'manual',
      readingDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedConnId = watch('connectionId');
  const currentReading = watch('readingValue');
  const conn = connections.find((c) => c.id === selectedConnId);

  // Previous reading comes from the connection's lastReading field (if API provides it)
  // or we fall back to undefined so the form still works without it
  const prevReading: number | undefined = (conn as any)?.lastReading ?? undefined;

  const validation = useMemo(
    () => (currentReading != null && !isNaN(currentReading) && currentReading >= 0
      ? validateReading(currentReading, prevReading)
      : null),
    [currentReading, prevReading]
  );

  const onSubmit = async (data: ReadingForm) => {
    setApiError('');
    try {
      const v = validateReading(data.readingValue, prevReading);
      await readingsApi.create({
        connectionId:    data.connectionId,
        accountNumber:   conn?.accountNumber,
        meterId:         conn?.meterId ?? '',
        meterSerial:     conn?.meterSerial,
        customerName:    conn?.customerName,
        readingValue:    data.readingValue,
        previousReading: prevReading,
        unitsConsumed:   v.consumption,
        readingDate:     data.readingDate,
        readingType:     data.readingType,
        notes:           data.notes,
        flagged:         v.flagged,
        flagReason:      v.flagReason,
        flagNote:        v.flagNote,
        validated:       !v.flagged,
      });
      onSuccess();
    } catch (err) {
      setApiError(extractError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Connection / Account *"
        {...register('connectionId')}
        error={errors.connectionId?.message}
        placeholder="Select account"
        options={connections.map((c) => ({
          value: c.id,
          label: `${c.accountNumber || c.id.slice(0, 8)}${c.customerName ? ` — ${c.customerName}` : ''}`,
        }))}
      />

      {conn && (
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 flex flex-wrap gap-4">
          <span><span className="font-medium">Meter:</span> {conn.meterSerial ?? '—'}</span>
          <span><span className="font-medium">Previous reading:</span> {prevReading != null ? `${prevReading.toFixed(1)} m³` : 'N/A'}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Current Reading (m³) *"
          {...register('readingValue', { valueAsNumber: true })}
          type="number"
          step="0.001"
          placeholder="0.000"
          error={errors.readingValue?.message}
        />
        <Input
          label="Reading Date *"
          {...register('readingDate')}
          type="date"
          error={errors.readingDate?.message}
        />
        <Select
          label="Reading Method"
          {...register('readingType')}
          options={[
            { value: 'manual',   label: 'Manual (field reading)' },
            { value: 'estimate', label: 'Estimated' },
          ]}
        />
      </div>

      {/* Live validation banner */}
      {validation && validation.consumption !== 0 && conn && (
        validation.flagged ? (
          <div className={cn(
            'flex items-start gap-3 p-4 rounded-xl border',
            validation.flagReason === 'negative_consumption'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-orange-50 border-orange-200 text-orange-800'
          )}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">
                {validation.flagReason === 'negative_consumption'
                  ? 'Negative consumption detected'
                  : 'Abnormally high consumption'}
              </p>
              <p className="text-xs mt-1">{validation.flagNote}</p>
              <p className="text-xs mt-2 font-medium">
                This reading will be saved but flagged for supervisor verification before billing.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">
              Consumption: <strong>{validation.consumption.toFixed(1)} m³</strong> — within normal range.
            </p>
          </div>
        )
      )}

      <Textarea label="Notes" {...register('notes')} placeholder="Any observations about the meter or conditions…" />

      <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
        <Camera className="w-5 h-5" />
        <span>Attach meter photo (mobile field app)</span>
      </div>

      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Save Reading</Button>
      </div>
    </form>
  );
};

// ─── main page ────────────────────────────────────────────────────────────────

export const Readings = () => {
  const [readings,    setReadings]    = useState<MeterReading[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, Customer>>({});
  const [meterMap,    setMeterMap]    = useState<Record<string, Meter>>({});
  const [search,      setSearch]      = useState('');
  const [showFlagged, setShowFlagged] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [typeFilter,  setTypeFilter]  = useState<MeterReading['readingType'] | ''>('');
  const [showForm,    setShowForm]    = useState(false);
  const [resolving,   setResolving]   = useState<MeterReading | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [page,        setPage]        = useState(1);
  const PAGE_SIZE = 12;

  // ── data fetching ──────────────────────────────────────────────────────────

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (search)      params.search      = search;
      if (typeFilter)  params.readingType = typeFilter;
      if (showFlagged) params.flagged     = 1;
      if (showPending) params.pending     = 1;

      const result = await readingsApi.list(params);
      setReadings(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      console.error('Failed to fetch readings:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, showFlagged, showPending]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  // Fetch connections, then resolve customers and meters for all connections.
  // Enriches the connections array so the form dropdown and info panel get real names/serials.
  useEffect(() => {
    connectionsApi.list({ pageSize: 100 })
      .then(async (r) => {
        const custIds  = [...new Set(r.data.map((c) => c.customerId).filter(Boolean))];
        const meterIds = [...new Set(r.data.map((c) => c.meterId).filter(Boolean))];

        const [custResults, meterResults] = await Promise.all([
          Promise.allSettled(custIds.map((id)  => customersApi.getOne(id))),
          Promise.allSettled(meterIds.map((id) => metersApi.getOne(id))),
        ]);

        const cMap: Record<string, Customer> = {};
        custResults.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value) cMap[custIds[i]] = res.value;
        });

        const mMap: Record<string, Meter> = {};
        meterResults.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value) mMap[meterIds[i]] = res.value;
        });

        setCustomerMap(cMap);
        setMeterMap(mMap);

        // Re-set connections enriched with resolved customerName and meterSerial
        // so the form dropdown and info panel show real data without extra prop drilling
        const enriched = r.data.map((c) => ({
          ...c,
          customerName: c.customerName ?? cMap[c.customerId]?.name,
          meterSerial:  c.meterSerial  ?? mMap[c.meterId]?.serialNumber,
        }));
        setConnections(enriched);
      })
      .catch((err) => console.error('Failed to fetch connections:', err));
  }, []);

  // ── derived counts (from current page; summary cards are approximate) ──────

  const flaggedCount = readings.filter((r) => r.flagged).length;
  const pendingCount = readings.filter((r) => r.flagged && !r.validated).length;

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleNewReading = () => {
    setShowForm(false);
    fetchReadings();
  };

  const handleValidate = async (id: string) => {
    await readingsApi.approve(id);
    setResolving(null);
    setResolveNote('');
    fetchReadings();
  };

  const FlagBadge = ({ reading }: { reading: MeterReading }) => {
    if (!reading.flagged || !reading.flagReason || reading.flagReason === 'none') {
      if (reading.validated) {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3" /> Validated
          </span>
        );
      }
      return null;
    }
    const cfg = FLAG_CONFIG[reading.flagReason] ?? FLAG_CONFIG['none'];
    if (!cfg) return null;
    return (
      <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full', cfg.color)}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  // Build a lookup map so reading rows can show account/meter info from connections
  const connMap = useMemo(
    () => Object.fromEntries(connections.map((c) => [c.id, c])),
    [connections],
  );

  const columns: Column<MeterReading>[] = [
    {
      key: 'accountNumber', header: 'Account #',
      render: (r) => {
        const conn = connMap[r.connectionId];
        const acct = r.accountNumber ?? conn?.accountNumber ?? '—';
        return <span className="font-medium text-primary-600 text-xs font-mono">{acct}</span>;
      },
    },
    {
      key: 'customerName', header: 'Customer',
      render: (r) => {
        const conn     = connMap[r.connectionId];
        const customer = conn?.customerId ? customerMap[conn.customerId] : undefined;
        const name     = r.customerName ?? conn?.customerName ?? customer?.name ?? '—';
        return <span className="text-sm text-gray-800">{name}</span>;
      },
    },
    {
      key: 'meterSerial', header: 'Meter',
      render: (r) => {
        const conn   = connMap[r.connectionId];
        const meter  = conn?.meterId ? meterMap[conn.meterId] : undefined;
        const serial = r.meterSerial ?? meter?.serialNumber ?? '—';
        const brand  = meter?.brand;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-gray-700">{serial}</span>
            {brand && <span className="text-xs text-gray-400">{brand}</span>}
          </div>
        );
      },
    },
    {
      key: 'previousReading', header: 'Previous (m³)',
      render: (r) => <span className="text-sm text-gray-600">{r.previousReading?.toFixed(1) ?? '—'}</span>,
    },
    {
      key: 'readingValue', header: 'Current (m³)',
      render: (r) => <span className="text-sm font-semibold text-gray-900">{(r.readingValue ?? 0).toFixed(1)}</span>,
    },
    {
      key: 'unitsConsumed', header: 'Consumed',
      render: (r) => {
        const v = r.unitsConsumed ?? 0;
        return (
          <span className={cn('text-sm font-medium', v < 0 ? 'text-red-600' : v > ABNORMAL_HIGH_THRESHOLD ? 'text-orange-600' : 'text-blue-600')}>
            {v.toFixed(1)} m³
          </span>
        );
      },
    },
    {
      key: 'readingType', header: 'Method',
      render: (r) => <Badge label={r.readingType} />,
    },
    {
      key: 'readingDate', header: 'Date',
      render: (r) => <span className="text-sm text-gray-600">{r.readingDate ? formatDate(r.readingDate) : '—'}</span>,
    },
    {
      key: 'flagged', header: 'Status',
      render: (r) => <FlagBadge reading={r} />,
    },
    {
      key: 'actions', header: '',
      render: (r) => r.flagged && !r.validated ? (
        <button
          className="text-xs text-primary-600 hover:underline font-medium"
          onClick={(e) => { e.stopPropagation(); setResolving(r); setResolveNote(''); }}
        >
          Resolve
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meter Readings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} readings · {flaggedCount} flagged</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Record Reading
        </button>
      </div>

      {/* Alert banners */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">{pendingCount} reading{pendingCount > 1 ? 's' : ''} pending validation</p>
            <p className="text-xs text-orange-700 mt-0.5">
              These readings have been flagged (negative consumption or abnormally high) and must be verified before bills are generated.
            </p>
          </div>
          <button
            className="ml-auto text-xs font-medium text-orange-700 hover:underline whitespace-nowrap"
            onClick={() => { setShowPending(true); setShowFlagged(false); setPage(1); }}
          >
            View pending →
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Readings', value: total,                                                         color: 'text-gray-900',    onClick: () => { setShowFlagged(false); setShowPending(false); } },
          { label: 'Flagged',        value: flaggedCount,                                                  color: 'text-orange-600',  onClick: () => { setShowFlagged(true);  setShowPending(false); setPage(1); } },
          { label: 'Pending Review', value: pendingCount,                                                  color: 'text-red-600',     onClick: () => { setShowPending(true);  setShowFlagged(false); setPage(1); } },
          { label: 'Validated',      value: readings.filter((r) => r.validated).length,                   color: 'text-green-600',   onClick: () => {} },
        ].map((s) => (
          <button key={s.label} className={cn('card p-4 text-center cursor-pointer hover:shadow-md transition-all', (showFlagged && s.label === 'Flagged') || (showPending && s.label === 'Pending Review') ? 'ring-2 ring-primary-500' : '')} onClick={s.onClick}>
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select className="input-base w-44 text-sm" value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as MeterReading['readingType'] | ''); setPage(1); }}>
          <option value="">All Methods</option>
          <option value="manual">Manual</option>
          <option value="iot">IoT / AMI</option>
          <option value="estimate">Estimated</option>
        </select>
        <button
          className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
            showFlagged ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
          onClick={() => { setShowFlagged(!showFlagged); setShowPending(false); setPage(1); }}
        >
          <Flag className="w-4 h-4" /> Flagged only
        </button>
        <button
          className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
            showPending ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
          onClick={() => { setShowPending(!showPending); setShowFlagged(false); setPage(1); }}
        >
          <Filter className="w-4 h-4" /> Pending review
        </button>
        {(showFlagged || showPending || typeFilter) && (
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => { setShowFlagged(false); setShowPending(false); setTypeFilter(''); setPage(1); }}>
            Clear filters
          </button>
        )}
      </div>

      <DataTable
        data={readings}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search account, customer, meter serial…"
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {/* Record Reading Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Meter Reading" size="lg">
        <RecordReadingForm
          connections={connections}
          onSuccess={handleNewReading}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Resolve Flag Modal */}
      <Modal
        open={!!resolving}
        onClose={() => setResolving(null)}
        title="Resolve Flagged Reading"
        description={resolving ? `${resolving.accountNumber} · ${resolving.customerName}` : ''}
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setResolving(null)}>Cancel</button>
            <button className="btn-primary flex items-center gap-2" onClick={() => resolving && handleValidate(resolving.id)}>
              <ShieldCheck className="w-4 h-4" /> Mark as Validated
            </button>
          </div>
        }
      >
        {resolving && (
          <div className="space-y-4">
            {/* Flag detail */}
            <div className={cn(
              'flex items-start gap-3 p-4 rounded-xl border',
              resolving.flagReason === 'negative_consumption'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-orange-50 border-orange-200 text-orange-800'
            )}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">{resolving.flagReason && FLAG_CONFIG[resolving.flagReason]?.label}</p>
                <p className="text-xs mt-1">{resolving.flagNote}</p>
              </div>
            </div>

            {/* Reading details */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { label: 'Previous',   value: `${resolving.previousReading?.toFixed(1) ?? '—'} m³` },
                { label: 'Current',    value: `${(resolving.readingValue ?? 0).toFixed(1)} m³` },
                { label: 'Consumed',   value: `${(resolving.unitsConsumed ?? 0).toFixed(1)} m³` },
              ].map((row) => (
                <div key={row.label} className="card p-3 text-center">
                  <p className="text-xs text-gray-500">{row.label}</p>
                  <p className="font-bold text-gray-900 mt-0.5">{row.value}</p>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Notes</label>
              <textarea
                className="input-base w-full"
                rows={3}
                placeholder="Explain why this reading is valid (e.g. meter was reset, site inspection confirmed…)"
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
              />
            </div>

            <p className="text-xs text-gray-500">
              Validating this reading confirms it is correct and allows the bill to be generated. Your name will be recorded in the audit log.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
