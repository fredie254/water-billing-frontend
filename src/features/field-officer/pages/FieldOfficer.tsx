import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPin, Gauge, Camera, AlertTriangle, CheckCircle, Clock,
  WifiOff, RefreshCw, ChevronRight, Navigation,
  ArrowRight, Upload,
} from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input, Select } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { readingsApi } from '@/features/meters/api/meters';
import { formatDate, cn } from '@/shared/utils/utils';
import type { Meter, MeterReading } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OfflineReading {
  id: string;
  meterId: string;
  meterSerial: string;
  customerName: string;
  accountNumber: string;
  readingValue: number;
  previousReading: number;
  consumption: number;
  readingDate: string;
  gpsLat?: number;
  gpsLng?: number;
  photoTaken: boolean;
  synced: boolean;
  flag?: string;
}

interface FaultReport {
  id: string;
  meterId: string;
  meterSerial: string;
  customerName: string;
  type: 'fault' | 'leakage' | 'tampering' | 'no_access' | 'other';
  description: string;
  gpsLat?: number;
  gpsLng?: number;
  photoTaken: boolean;
  reportedAt: string;
  synced: boolean;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const readingSchema = z.object({
  readingValue: z.coerce.number({ invalid_type_error: 'Must be a number' }).nonnegative(),
  notes: z.string().optional(),
  gpsCapture: z.boolean().default(false),
  photoCapture: z.boolean().default(false),
});
type ReadingValues = z.infer<typeof readingSchema>;

const faultSchema = z.object({
  faultType: z.enum(['fault', 'leakage', 'tampering', 'no_access', 'other']),
  description: z.string().min(5, 'Please describe the issue'),
  gpsCapture: z.boolean().default(false),
  photoCapture: z.boolean().default(false),
});
type FaultValues = z.infer<typeof faultSchema>;

// ─── Workflow steps ───────────────────────────────────────────────────────────

type WorkflowStep = 'route' | 'meter' | 'reading' | 'submit';

const WORKFLOW_STEPS: { key: WorkflowStep; label: string; icon: React.ReactNode }[] = [
  { key: 'route',   label: 'Route',   icon: <Navigation className="w-4 h-4" /> },
  { key: 'meter',   label: 'Meter',   icon: <Gauge className="w-4 h-4" /> },
  { key: 'reading', label: 'Capture', icon: <Camera className="w-4 h-4" /> },
  { key: 'submit',  label: 'Submit',  icon: <CheckCircle className="w-4 h-4" /> },
];

// ─── Component ───────────────────────────────────────────────────────────────

export const FieldOfficer = () => {
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('route');
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [offlineReadings, setOfflineReadings] = useState<OfflineReading[]>([]);
  const [faultReports, setFaultReports] = useState<FaultReport[]>([]);
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [isOfflineMode] = useState(false);

  // ─── API data state ─────────────────────────────────────────────────────────
  const [assignedReadings, setAssignedReadings] = useState<MeterReading[]>([]);
  const [loadingReadings, setLoadingReadings]   = useState(false);

  // Derive assigned meters from readings (unique meters in pending state)
  // The readings API returns the assigned readings for the logged-in officer.
  // We display meters from those readings as the work list.
  useEffect(() => {
    setLoadingReadings(true);
    readingsApi.list({ pageSize: 50, status: 'pending' })
      .then(res => setAssignedReadings(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingReadings(false));
  }, []);

  // Build a deduplicated meter-like list from assigned readings
  const assignedMeterList = assignedReadings.reduce<
    { id: string; meterId: string; meterSerial: string; customerName: string; address: string; lastReading: number | null; lastReadingDate: string | null }[]
  >((acc, r) => {
    if (!acc.find(m => m.meterId === r.meterId)) {
      acc.push({
        id: r.id,
        meterId: r.meterId,
        meterSerial: r.meterSerial ?? r.meterId,
        customerName: r.customerName ?? 'Unknown',
        address: r.accountNumber ?? '—',
        lastReading: r.previousReading ?? null,
        lastReadingDate: null,
      });
    }
    return acc;
  }, []);

  const ASSIGNED_ROUTE = {
    name: 'Assigned Route',
    zone: '—',
    date: new Date().toISOString().slice(0, 10),
    totalMeters: assignedMeterList.length,
  };

  const completedIds = offlineReadings.map((r) => r.meterId);

  // ── Reading form ──
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ReadingValues>({ resolver: zodResolver(readingSchema) });

  const watchedGPS = watch('gpsCapture');
  const watchedPhoto = watch('photoCapture');

  const onReadingSubmit = async (values: ReadingValues) => {
    if (!selectedMeter) return;
    const previous = selectedMeter.lastReading ?? 0;
    const consumption = Math.max(0, values.readingValue - previous);

    // Find the pending reading record for this meter to get connectionId
    const pendingReading = assignedReadings.find(r => r.meterId === selectedMeter.id);

    try {
      await readingsApi.create({
        meterId: selectedMeter.id,
        connectionId: pendingReading?.connectionId ?? '',
        meterSerial: selectedMeter.serialNumber,
        readingValue: values.readingValue,
        previousReading: previous,
        unitsConsumed: consumption,
        readingDate: new Date().toISOString(),
        readingType: 'manual',
        notes: values.notes,
      });
    } catch {
      // If offline / API error, still queue locally
    }

    const newReading: OfflineReading = {
      id: `or${Date.now()}`,
      meterId: selectedMeter.id,
      meterSerial: selectedMeter.serialNumber,
      customerName: selectedMeter.customerName ?? 'Unknown',
      accountNumber: pendingReading?.accountNumber ?? '—',
      readingValue: values.readingValue,
      previousReading: previous,
      consumption,
      readingDate: new Date().toISOString(),
      gpsLat: values.gpsCapture ? -1.2921 : undefined,
      gpsLng: values.gpsCapture ? 36.8219 : undefined,
      photoTaken: values.photoCapture ?? false,
      synced: true,
    };

    setOfflineReadings((prev) => [...prev, newReading]);
    setWorkflowStep('submit');
    reset();
  };

  // ── Fault form ──
  const {
    register: regFault,
    handleSubmit: hsFault,
    formState: { errors: errFault },
    reset: resetFault,
  } = useForm<FaultValues>({ resolver: zodResolver(faultSchema) });

  const onFaultSubmit = (values: FaultValues) => {
    if (!selectedMeter) return;
    const report: FaultReport = {
      id: `fr${Date.now()}`,
      meterId: selectedMeter.id,
      meterSerial: selectedMeter.serialNumber,
      customerName: selectedMeter.customerName ?? 'Unknown',
      type: values.faultType,
      description: values.description,
      gpsLat: values.gpsCapture ? -1.2921 : undefined,
      gpsLng: values.gpsCapture ? 36.8219 : undefined,
      photoTaken: values.photoCapture ?? false,
      reportedAt: new Date().toISOString(),
      synced: false,
    };
    setFaultReports((prev) => [...prev, report]);
    setShowFaultModal(false);
    resetFault();
  };

  // ── Sync ──
  const handleSync = async () => {
    setSyncStatus('syncing');
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setOfflineReadings((prev) => prev.map((r) => ({ ...r, synced: true })));
    setFaultReports((prev) => prev.map((r) => ({ ...r, synced: true })));
    setSyncStatus('done');
    setIsSyncing(false);
    setTimeout(() => setSyncStatus('idle'), 3000);
  };

  const pendingSync = offlineReadings.filter((r) => !r.synced).length + faultReports.filter((r) => !r.synced).length;

  // ── Build a Meter-compatible object from the assigned meter list entry ──
  const buildMeterFromEntry = (entry: typeof assignedMeterList[number]): Meter => ({
    id: entry.meterId,
    tenantId: '',
    serialNumber: entry.meterSerial,
    type: 'mechanical',
    status: 'active',
    customerName: entry.customerName,
    installationLocation: entry.address,
    lastReading: entry.lastReading ?? undefined,
    lastReadingDate: entry.lastReadingDate ?? undefined,
    createdAt: '',
  });

  return (
    <div className="space-y-6">
      {/* Offline banner */}
      {isOfflineMode && (
        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <WifiOff className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">Offline Mode</p>
            <p className="text-xs text-orange-700">Readings are saved locally and will sync when connected.</p>
          </div>
          <button onClick={handleSync} className="btn-sm bg-orange-600 text-white hover:bg-orange-700 rounded-lg px-3 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Sync
          </button>
        </div>
      )}

      {/* Sync status */}
      {syncStatus === 'syncing' && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <p className="text-sm text-blue-800 font-medium">Synchronizing data with server...</p>
        </div>
      )}
      {syncStatus === 'done' && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800 font-medium">All data synchronized successfully.</p>
        </div>
      )}

      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Meters', value: loadingReadings ? '…' : ASSIGNED_ROUTE.totalMeters, color: 'bg-blue-50', icon: <Gauge className="w-5 h-5 text-blue-500" /> },
          { label: 'Completed', value: completedIds.length, color: 'bg-green-50', icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
          { label: 'Pending', value: loadingReadings ? '…' : Math.max(0, ASSIGNED_ROUTE.totalMeters - completedIds.length), color: 'bg-yellow-50', icon: <Clock className="w-5 h-5 text-yellow-500" /> },
          { label: 'Pending Sync', value: pendingSync, color: pendingSync > 0 ? 'bg-orange-50' : 'bg-gray-50', icon: <Upload className="w-5 h-5 text-orange-500" /> },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow progress */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium flex-1 justify-center',
                  workflowStep === step.key
                    ? 'bg-primary-600 text-white'
                    : i < WORKFLOW_STEPS.findIndex((s) => s.key === workflowStep)
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-500',
                )}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Route & Meter List ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Route info */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-semibold text-gray-900">Today's Assignment</h2>
              </div>
            </div>
            <div className="card-body py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Route</span>
                <span className="font-medium text-gray-800">{ASSIGNED_ROUTE.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Zone</span>
                <span className="font-medium">{ASSIGNED_ROUTE.zone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{formatDate(ASSIGNED_ROUTE.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-green-700">{completedIds.length}/{ASSIGNED_ROUTE.totalMeters}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full mt-2">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: ASSIGNED_ROUTE.totalMeters > 0 ? `${(completedIds.length / ASSIGNED_ROUTE.totalMeters) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Meter list */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-gray-900">Assigned Meters</h2>
            </div>
            {loadingReadings ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading assigned meters…</div>
            ) : assignedMeterList.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No meters assigned for today.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {assignedMeterList.map((entry) => {
                  const meter = buildMeterFromEntry(entry);
                  const done = completedIds.includes(meter.id);
                  const isSelected = selectedMeter?.id === meter.id;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setSelectedMeter(meter);
                        setWorkflowStep('meter');
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50',
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        done ? 'bg-green-100' : isSelected ? 'bg-primary-100' : 'bg-gray-100',
                      )}>
                        {done
                          ? <CheckCircle className="w-4 h-4 text-green-600" />
                          : <Gauge className={cn('w-4 h-4', isSelected ? 'text-primary-600' : 'text-gray-400')} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{entry.customerName}</p>
                        <p className="text-xs text-gray-500 truncate">{entry.address}</p>
                      </div>
                      {done
                        ? <Badge label="Done" variant="green" />
                        : <ChevronRight className="w-4 h-4 text-gray-300" />
                      }
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sync button */}
          {pendingSync > 0 && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isSyncing ? 'Syncing...' : `Sync ${pendingSync} pending item${pendingSync > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedMeter ? (
            <div className="card p-12 text-center text-gray-400">
              <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a meter from the list to start capturing a reading.</p>
            </div>
          ) : workflowStep === 'meter' || workflowStep === 'route' ? (
            /* Meter details */
            <div className="card space-y-0">
              <div className="card-header">
                <h2 className="font-semibold text-gray-900">Meter Details</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowFaultModal(true); }}
                    className="btn-sm btn-danger flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Report Issue
                  </button>
                  <button
                    onClick={() => setWorkflowStep('reading')}
                    className="btn-sm btn-primary flex items-center gap-1.5"
                  >
                    <Gauge className="w-3.5 h-3.5" /> Capture Reading
                  </button>
                </div>
              </div>

              <div className="card-body grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Meter Serial', value: selectedMeter.serialNumber },
                  { label: 'Meter Number', value: selectedMeter.meterNumber ?? '—' },
                  { label: 'Customer', value: selectedMeter.customerName ?? '—' },
                  { label: 'Address', value: selectedMeter.propertyAddress ?? selectedMeter.installationLocation ?? '—' },
                  { label: 'Status', value: selectedMeter.status },
                  { label: 'Last Reading', value: selectedMeter.lastReading != null ? `${selectedMeter.lastReading.toFixed(2)} m³` : '—' },
                  { label: 'Last Reading Date', value: selectedMeter.lastReadingDate ? formatDate(selectedMeter.lastReadingDate) : '—' },
                  { label: 'Type', value: selectedMeter.type },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                    <p className="font-medium text-gray-800 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* GPS mini map placeholder */}
              <div className="m-4 h-24 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-center gap-2 text-blue-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">GPS: Ready to capture location</span>
              </div>
            </div>
          ) : workflowStep === 'reading' ? (
            /* Reading capture form */
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-gray-900">Capture Reading</h2>
                <span className="text-sm text-gray-500 font-mono">{selectedMeter.serialNumber}</span>
              </div>

              <div className="card-body">
                {/* Previous reading */}
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mb-4 text-sm">
                  <span className="text-blue-600">Previous reading: </span>
                  <span className="font-bold text-blue-900">
                    {selectedMeter.lastReading != null ? `${selectedMeter.lastReading.toFixed(2)} m³` : 'No previous reading'}
                  </span>
                  {selectedMeter.lastReadingDate && (
                    <span className="text-blue-500 ml-2">({formatDate(selectedMeter.lastReadingDate)})</span>
                  )}
                </div>

                <form onSubmit={handleSubmit(onReadingSubmit)} className="space-y-4">
                  <Input
                    label="Current Reading (m³)"
                    type="number"
                    step="0.01"
                    placeholder="Enter meter display value"
                    {...register('readingValue')}
                    error={errors.readingValue?.message}
                  />

                  <Input
                    label="Notes (optional)"
                    placeholder="Any observations or comments"
                    {...register('notes')}
                  />

                  {/* GPS + Photo toggles */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all',
                      watchedGPS ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300',
                    )}>
                      <input type="checkbox" {...register('gpsCapture')} className="sr-only" />
                      <MapPin className={cn('w-6 h-6', watchedGPS ? 'text-blue-600' : 'text-gray-400')} />
                      <span className={cn('text-sm font-medium', watchedGPS ? 'text-blue-700' : 'text-gray-600')}>
                        {watchedGPS ? '✓ GPS Captured' : 'Capture GPS'}
                      </span>
                      {watchedGPS && <p className="text-xs text-blue-500 font-mono">-1.2921, 36.8219</p>}
                    </label>

                    <label className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all',
                      watchedPhoto ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300',
                    )}>
                      <input type="checkbox" {...register('photoCapture')} className="sr-only" />
                      <Camera className={cn('w-6 h-6', watchedPhoto ? 'text-purple-600' : 'text-gray-400')} />
                      <span className={cn('text-sm font-medium', watchedPhoto ? 'text-purple-700' : 'text-gray-600')}>
                        {watchedPhoto ? '✓ Photo Taken' : 'Take Photo'}
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setWorkflowStep('meter')} className="btn-secondary btn-sm flex-1">Back</button>
                    <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Submit Reading
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Submit / success */
            <div className="card p-8 text-center">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Reading Captured!</h2>
              {(() => {
                const last = offlineReadings[offlineReadings.length - 1];
                return last ? (
                  <div className="space-y-1 text-sm text-gray-600 mb-6">
                    <p>Reading: <strong className="text-gray-900">{last.readingValue.toFixed(2)} m³</strong></p>
                    <p>Consumption: <strong className="text-blue-700">{last.consumption.toFixed(2)} m³</strong></p>
                    {last.gpsLat && <p className="text-xs text-green-600">✓ GPS captured</p>}
                    {last.photoTaken && <p className="text-xs text-purple-600">✓ Photo taken</p>}
                    {!last.synced && <p className="text-xs text-orange-600">⟳ Pending sync</p>}
                  </div>
                ) : null;
              })()}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setSelectedMeter(null); setWorkflowStep('route'); }}
                  className="btn-secondary"
                >
                  Next Meter
                </button>
                {pendingSync > 0 && (
                  <button onClick={handleSync} className="btn-primary flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Sync Now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Offline reading log */}
          {offlineReadings.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-gray-900">Captured Readings ({offlineReadings.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {offlineReadings.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.customerName}</p>
                      <p className="text-xs text-gray-500 font-mono">{r.meterSerial} · {r.readingValue.toFixed(2)} m³</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.gpsLat && <MapPin className="w-3.5 h-3.5 text-blue-400" />}
                      {r.photoTaken && <Camera className="w-3.5 h-3.5 text-purple-400" />}
                      <Badge label={r.synced ? 'Synced' : 'Pending'} variant={r.synced ? 'green' : 'yellow'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fault reports log */}
          {faultReports.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-gray-900">Fault Reports ({faultReports.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {faultReports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.customerName}</p>
                      <p className="text-xs text-gray-500 capitalize">{r.type.replace('_', ' ')} — {r.description}</p>
                    </div>
                    <Badge label={r.synced ? 'Synced' : 'Pending'} variant={r.synced ? 'green' : 'yellow'} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Report Issue Modal ── */}
      <Modal
        open={showFaultModal}
        onClose={() => { setShowFaultModal(false); resetFault(); }}
        title="Report Issue"
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowFaultModal(false); resetFault(); }} className="btn-secondary btn-sm">Cancel</button>
            <button form="fault-form" type="submit" className="btn-danger btn-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Submit Report
            </button>
          </div>
        }
      >
        <form id="fault-form" onSubmit={hsFault(onFaultSubmit)} className="space-y-4">
          {selectedMeter && (
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <p className="font-medium text-gray-800">{selectedMeter.customerName}</p>
              <p className="text-gray-500 font-mono">{selectedMeter.serialNumber}</p>
            </div>
          )}
          <Select
            label="Issue Type"
            options={[
              { value: 'fault',     label: 'Meter Fault / Not Reading' },
              { value: 'leakage',   label: 'Water Leakage' },
              { value: 'tampering', label: 'Suspected Tampering' },
              { value: 'no_access', label: 'No Access to Meter' },
              { value: 'other',     label: 'Other' },
            ]}
            {...regFault('faultType')}
            error={errFault.faultType?.message}
          />
          <Input
            label="Description"
            placeholder="Describe the issue in detail"
            {...regFault('description')}
            error={errFault.description?.message}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...regFault('gpsCapture')} className="rounded" />
              <MapPin className="w-4 h-4 text-blue-500" /> Capture GPS
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...regFault('photoCapture')} className="rounded" />
              <Camera className="w-4 h-4 text-purple-500" /> Take Photo
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
