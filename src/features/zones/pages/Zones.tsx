import { useState, useMemo, useEffect } from 'react';
import {
  MapPin, Route, Plus, Search, Users, Activity, ChevronRight,
  Map, Filter, CheckCircle2, Clock, Layers, Grid3X3,
} from 'lucide-react';
import { zonesApi, routesApi } from '@/features/zones/api/zones';
import { formatDate, cn } from '@/shared/utils/utils';
import { Badge } from '@/shared/components/ui/Badge';
import { Select } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { extractError } from '@/core/api/client';
import type { Zone, MeterRoute } from '@/types';

type Tab = 'zones' | 'routes';

const SUB_COUNTY_COLOR: Record<string, string> = {
  'Kirinyaga Central': 'bg-blue-100 text-blue-700 border-blue-200',
  'Kirinyaga West':    'bg-green-100 text-green-700 border-green-200',
  'Kirinyaga East':    'bg-amber-100 text-amber-700 border-amber-200',
  'Kirinyaga North':   'bg-purple-100 text-purple-700 border-purple-200',
  'Kirinyaga South':   'bg-rose-100 text-rose-700 border-rose-200',
};

const SUB_COUNTY_ICON_BG: Record<string, string> = {
  'Kirinyaga Central': 'bg-blue-500',
  'Kirinyaga West':    'bg-green-500',
  'Kirinyaga East':    'bg-amber-500',
  'Kirinyaga North':   'bg-purple-500',
  'Kirinyaga South':   'bg-rose-500',
};

const SUB_COUNTIES = [
  'Kirinyaga Central',
  'Kirinyaga East',
  'Kirinyaga West',
  'Kirinyaga North',
  'Kirinyaga South',
];

// ─── Zone Form ────────────────────────────────────────────────────────────────

const ZoneForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const [form, setForm] = useState({ code: '', name: '', subCounty: SUB_COUNTIES[0], description: '', area: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) { setError('Code and name are required.'); return; }
    setSaving(true);
    setError('');
    try {
      await zonesApi.create({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        subCounty: form.subCounty,
        description: form.description.trim() || undefined,
        area: form.area ? Number(form.area) : undefined,
      });
      onSuccess();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zone Code *</label>
          <input className="input-base" placeholder="e.g. KRG" value={form.code} onChange={set('code')} maxLength={10} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name *</label>
          <input className="input-base" placeholder="e.g. Kerugoya" value={form.name} onChange={set('name')} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sub-County *</label>
        <select className="input-base w-full" value={form.subCounty} onChange={set('subCounty')}>
          {SUB_COUNTIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea className="input-base w-full" rows={2} placeholder="Brief description of the zone…" value={form.description} onChange={set('description')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Area (km²)</label>
        <input className="input-base" type="number" step="0.01" placeholder="e.g. 12.5" value={form.area} onChange={set('area')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>Create Zone</Button>
      </div>
    </form>
  );
};

// ─── Route Form ───────────────────────────────────────────────────────────────

const RouteForm = ({ zones, defaultZoneId, onSuccess, onCancel }: {
  zones: Zone[];
  defaultZoneId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState({ zoneId: defaultZoneId ?? zones[0]?.id ?? '', routeCode: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zoneId || !form.routeCode.trim() || !form.name.trim()) { setError('Zone, route code and name are required.'); return; }
    setSaving(true);
    setError('');
    try {
      await routesApi.create({
        zoneId: form.zoneId,
        routeCode: form.routeCode.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Zone *</label>
        <select className="input-base w-full" value={form.zoneId} onChange={set('zoneId')}>
          <option value="">Select zone…</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Route Code *</label>
          <input className="input-base" placeholder="e.g. KRG-001" value={form.routeCode} onChange={set('routeCode')} maxLength={20} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Route Name *</label>
          <input className="input-base" placeholder="e.g. Kerugoya North" value={form.name} onChange={set('name')} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea className="input-base w-full" rows={2} placeholder="Optional description…" value={form.description} onChange={set('description')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>Create Route</Button>
      </div>
    </form>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const Zones = () => {
  const [tab, setTab]           = useState<Tab>('zones');
  const [search, setSearch]     = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [activeZone, setActiveZone] = useState<string>('');

  const [zones, setZones]   = useState<Zone[]>([]);
  const [routes, setRoutes] = useState<MeterRoute[]>([]);
  const [loadingZones, setLoadingZones]   = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const [showZoneForm,  setShowZoneForm]  = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [newRouteZoneId, setNewRouteZoneId] = useState<string | undefined>();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchZones = () => {
    setLoadingZones(true);
    zonesApi.list({ pageSize: 100 })
      .then(r => setZones(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingZones(false));
  };

  const fetchRoutes = () => {
    setLoadingRoutes(true);
    routesApi.list({ pageSize: 100 })
      .then(r => setRoutes(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingRoutes(false));
  };

  useEffect(() => { fetchZones(); fetchRoutes(); }, []);

  const openAddRoute = (zoneId?: string) => {
    setNewRouteZoneId(zoneId);
    setShowRouteForm(true);
  };

  // ── Filtered zones ─────────────────────────────────────────────────────────
  const filteredZones = useMemo(() => {
    const q = search.toLowerCase();
    return zones.filter(z =>
      (!subFilter || z.subCounty === subFilter) &&
      (!q || z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q) || z.description?.toLowerCase().includes(q))
    );
  }, [zones, search, subFilter]);

  // ── Filtered routes ────────────────────────────────────────────────────────
  const filteredRoutes = useMemo(() => {
    const q = search.toLowerCase();
    return routes.filter(r =>
      (!activeZone || r.zoneId === activeZone) &&
      (!q || r.routeCode.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.zoneName?.toLowerCase().includes(q))
    );
  }, [routes, search, activeZone]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalConnections  = zones.reduce((s, z) => s + (z.totalConnections ?? 0), 0);
  const activeConnections = zones.reduce((s, z) => s + (z.activeConnections ?? 0), 0);
  const totalRoutes       = routes.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zones & Routes</h1>
          <p className="text-sm text-gray-500 mt-0.5">KIRIWASCO service area — Kirinyaga County</p>
        </div>
        <div className="flex gap-2">
          {tab === 'routes' && (
            <button className="btn-secondary btn-sm" onClick={() => openAddRoute(activeZone || undefined)}>
              <Route className="w-4 h-4" /> Add Route
            </button>
          )}
          {tab === 'zones' && (
            <button className="btn-primary" onClick={() => setShowZoneForm(true)}>
              <Plus className="w-4 h-4" /> New Zone
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<Layers className="w-5 h-5 text-blue-500" />}    bg="bg-blue-50"   label="Total Zones"        value={zones.length.toString()} />
        <KpiCard icon={<Route className="w-5 h-5 text-green-500" />}    bg="bg-green-50"  label="Total Routes"       value={totalRoutes.toString()} />
        <KpiCard icon={<Activity className="w-5 h-5 text-water-500" />} bg="bg-water-50"  label="Active Connections"  value={activeConnections.toLocaleString()} />
        <KpiCard icon={<Users className="w-5 h-5 text-purple-500" />}   bg="bg-purple-50" label="Total Connections"   value={totalConnections.toLocaleString()} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['zones', 'Zones', <Grid3X3 key="z" className="w-4 h-4" />], ['routes', 'Routes', <Route key="r" className="w-4 h-4" />]] as const).map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => { setTab(id as Tab); setSearch(''); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ════════════════════════ ZONES TAB ════════════════════════ */}
      {tab === 'zones' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input-base pl-9"
                placeholder="Search zones…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Sub-Counties' },
                ...SUB_COUNTIES.map(s => ({ value: s, label: s })),
              ]}
              value={subFilter}
              onChange={e => setSubFilter(e.target.value)}
              className="w-56"
            />
          </div>

          {/* Sub-county legend */}
          <div className="flex flex-wrap gap-2">
            {SUB_COUNTIES.map(sc => (
              <button
                key={sc}
                onClick={() => setSubFilter(subFilter === sc ? '' : sc)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  SUB_COUNTY_COLOR[sc],
                  subFilter === sc ? 'ring-2 ring-offset-1 ring-current' : 'opacity-75 hover:opacity-100'
                )}
              >
                {sc}
              </button>
            ))}
          </div>

          {/* Loading skeleton */}
          {loadingZones && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="card-body space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-8 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Zone cards */}
          {!loadingZones && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredZones.map(zone => {
                const routeCount = routes.filter(r => r.zoneId === zone.id).length;
                const total = zone.totalConnections ?? 0;
                const active = zone.activeConnections ?? 0;
                const utilPct = total > 0 ? Math.round((active / total) * 100) : 0;
                return (
                  <div
                    key={zone.id}
                    className="card hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => { setTab('routes'); setActiveZone(zone.id); setSearch(''); }}
                  >
                    <div className="card-body space-y-4">
                      {/* Top row */}
                      <div className="flex items-start gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0', SUB_COUNTY_ICON_BG[zone.subCounty] ?? 'bg-gray-400')}>
                          {zone.code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors leading-tight">{zone.name}</h3>
                            <Badge label={zone.status} variant={zone.status === 'active' ? 'green' : 'gray'} />
                          </div>
                          <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border', SUB_COUNTY_COLOR[zone.subCounty] ?? 'bg-gray-100 text-gray-500 border-gray-200')}>
                            {zone.subCounty}
                          </span>
                        </div>
                      </div>

                      {zone.description && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{zone.description}</p>
                      )}

                      {/* Stats grid */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded-lg py-2">
                          <p className="text-sm font-bold text-gray-900">{total.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">Connections</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg py-2">
                          <p className="text-sm font-bold text-green-600">{active.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">Active</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg py-2">
                          <p className="text-sm font-bold text-blue-600">{routeCount}</p>
                          <p className="text-[10px] text-gray-500">Routes</p>
                        </div>
                      </div>

                      {/* Activity bar */}
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>Active connections</span>
                          <span className="font-semibold">{utilPct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', utilPct >= 90 ? 'bg-green-500' : utilPct >= 70 ? 'bg-blue-500' : 'bg-amber-500')}
                            style={{ width: `${utilPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                        {zone.area && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Map className="w-3 h-3" />{zone.area} km²
                          </span>
                        )}
                        <button
                          className="text-xs text-primary-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all ml-auto"
                          onClick={e => { e.stopPropagation(); setTab('routes'); setActiveZone(zone.id); setSearch(''); }}
                        >
                          View Routes <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add zone card */}
              <button
                className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary-300 hover:text-primary-500 cursor-pointer transition-colors min-h-[180px]"
                onClick={() => setShowZoneForm(true)}
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Add new zone</span>
              </button>
            </div>
          )}

          {!loadingZones && filteredZones.length === 0 && zones.length > 0 && (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No zones match your filter.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ ROUTES TAB ════════════════════════ */}
      {tab === 'routes' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input-base pl-9"
                placeholder="Search routes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Zones' },
                ...zones.map(z => ({ value: z.id, label: `${z.code} — ${z.name}` })),
              ]}
              value={activeZone}
              onChange={e => setActiveZone(e.target.value)}
              className="w-72"
            />
            {activeZone && (
              <button className="btn-ghost btn-sm text-xs" onClick={() => setActiveZone('')}>
                <Filter className="w-3.5 h-3.5" /> Clear zone filter
              </button>
            )}
          </div>

          {/* Zone quick-select chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveZone('')}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                !activeZone ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300')}
            >
              All Zones
            </button>
            {SUB_COUNTIES.map(sc => {
              const scZones = zones.filter(z => z.subCounty === sc);
              return (
                <div key={sc} className="flex items-center gap-1">
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', SUB_COUNTY_COLOR[sc])}>{sc.split(' ')[1]}</span>
                  {scZones.map(z => (
                    <button
                      key={z.id}
                      onClick={() => setActiveZone(activeZone === z.id ? '' : z.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        activeZone === z.id
                          ? 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      )}
                    >
                      {z.code}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{filteredRoutes.length}</span> routes
            {activeZone && <span> in <span className="font-semibold text-primary-600">{zones.find(z => z.id === activeZone)?.name}</span></span>}
          </p>

          {/* Routes table */}
          <div className="card">
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                {loadingRoutes ? (
                  <div className="py-12 text-center text-gray-400 text-sm">Loading routes…</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Route Code</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Route Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sub-County</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Connections</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Reader</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Reading</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredRoutes.map(route => {
                        const zone = zones.find(z => z.id === route.zoneId);
                        return (
                          <tr key={route.id} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-primary-700 text-sm">{route.routeCode}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{route.name}</p>
                              {route.description && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{route.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', SUB_COUNTY_ICON_BG[zone?.subCounty ?? ''] ?? 'bg-gray-300')} />
                                <span className="text-gray-700">{route.zoneName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border', SUB_COUNTY_COLOR[zone?.subCounty ?? ''] ?? 'bg-gray-100 text-gray-500 border-gray-200')}>
                                {zone?.subCounty ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-gray-900">{(route.connectionCount ?? 0).toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3">
                              {route.readerName ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                                    {route.readerName.charAt(0)}
                                  </div>
                                  <span className="text-gray-700 text-xs">{route.readerName}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {route.lastReadingDate ? (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  {formatDate(route.lastReadingDate)}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pending
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge label={route.status} variant={route.status === 'active' ? 'green' : 'gray'} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {!loadingRoutes && filteredRoutes.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Route className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No routes match your filter.</p>
                    <button className="mt-3 text-sm text-primary-600 hover:underline" onClick={() => openAddRoute(activeZone || undefined)}>
                      Add a route
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone form modal */}
      <Modal open={showZoneForm} onClose={() => setShowZoneForm(false)} title="New Zone" size="md">
        <ZoneForm
          onSuccess={() => { setShowZoneForm(false); fetchZones(); }}
          onCancel={() => setShowZoneForm(false)}
        />
      </Modal>

      {/* Route form modal */}
      <Modal open={showRouteForm} onClose={() => setShowRouteForm(false)} title="New Route" size="md">
        <RouteForm
          zones={zones}
          defaultZoneId={newRouteZoneId}
          onSuccess={() => { setShowRouteForm(false); fetchRoutes(); }}
          onCancel={() => setShowRouteForm(false)}
        />
      </Modal>
    </div>
  );
};

function KpiCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
