import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '@/core/auth/authStore';
import type { AuditAction } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ── Case converters ───────────────────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function convertKeys(obj: unknown, convert: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map((v) => convertKeys(v, convert));
  if (
    obj !== null &&
    typeof obj === 'object' &&
    !(obj instanceof Blob) &&
    !(obj instanceof FormData)
  ) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        convert(k),
        convertKeys(v, convert),
      ]),
    );
  }
  return obj;
}

// ── Axios instance ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Attach Bearer token + convert body/params to snake_case

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    // Use bracket notation — avoids any AxiosHeaders property-descriptor quirks
    config.headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.debug('[RUMAWASCO] No token for request:', config.url);
  }

  if (config.data && !(config.data instanceof FormData)) {
    config.data = convertKeys(config.data, toSnakeCase);
  }
  if (config.params) {
    config.params = convertKeys(config.params, toSnakeCase);
  }

  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
// Convert response keys to camelCase; redirect to login on 401 only

apiClient.interceptors.response.use(
  (res) => {
    if (res.data && !(res.data instanceof Blob)) {
      res.data = convertKeys(res.data, toCamelCase);
    }
    return res;
  },
  (error: AxiosError) => {
    // Only auto-logout on 401 Unauthorized — genuine auth failure
    // 403 Forbidden may be a permissions issue on a specific resource (not a lost session)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── List response unwrapper ───────────────────────────────────────────────────
// The API may return any of these shapes (after camelCase conversion):
//   { success, data: [ ...items ] }
//   { success, data: { data:[...], pagination:{total,page,pageSize} } }
//   { success, data: { items:[...], total, page, pageSize } }
//   { data:[...], pagination:{...} }  (PaginatedResponse directly)

export interface UnwrappedList<T> {
  data: T[];
  pagination: { total: number; page: number; pageSize: number };
}

export function unwrapList<T>(raw: unknown): UnwrappedList<T> {
  const body = raw as Record<string, unknown>;

  // Strip the outer { success, data, message } envelope when present
  const payload = (body?.success !== undefined ? body.data : body) as Record<string, unknown>;

  // Find the items array
  const items = (
    Array.isArray(payload)            ? payload           :
    Array.isArray(payload?.data)      ? payload.data      :
    Array.isArray(payload?.items)     ? payload.items     :
    Array.isArray(payload?.results)   ? payload.results   :
    []
  ) as T[];

  // Find pagination wherever it lives.
  // Some APIs put it at root (body.pagination) alongside data; others nest it inside payload.
  const pg = (
    payload?.pagination ??
    payload?.meta       ??
    body?.pagination    ??
    (Array.isArray(payload) ? {} : payload)
  ) as Record<string, unknown>;

  return {
    data: items,
    pagination: {
      total:    Number(pg?.total    ?? pg?.totalItems ?? pg?.count ?? items.length),
      page:     Number(pg?.page     ?? pg?.currentPage ?? 1),
      pageSize: Number(pg?.pageSize ?? pg?.perPage ?? pg?.limit ?? (items.length || 10)),
    },
  };
}

// ── Error helper ──────────────────────────────────────────────────────────────

export const extractError = (error: unknown): string => {
  const e = error as AxiosError<{ message?: string; detail?: string }>;
  return (
    e.response?.data?.message ||
    e.response?.data?.detail ||
    e.message ||
    'An unexpected error occurred'
  );
};

// ── Audit log interceptor ─────────────────────────────────────────────────────
// Fires after the camelCase response interceptor so res.data is already converted.
// Maps successful mutations → POST /audit-logs (fire-and-forget, never throws).

type AuditPayload = {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  resourceName?: string;
  description: string;
};

type AuditPattern = [
  method: string,
  pathRegex: RegExp,
  action: AuditAction,
  resource: string,
  describe: (pathParts: string[], data: Record<string, unknown>) => string,
  getResourceName?: (data: Record<string, unknown>) => string | undefined,
];

const str = (v: unknown) => (v ? String(v) : undefined);

const AUDIT_PATTERNS: AuditPattern[] = [
  // Auth
  ['POST', /^\/auth\/login$/,          'login',                'auth',         () => 'User logged in'],
  ['POST', /^\/auth\/logout$/,         'logout',               'auth',         () => 'User logged out'],
  // Users
  ['POST', /^\/users$/,                'user_created',         'user',         (_, d) => `Created user: ${d.name ?? d.email ?? ''}`],
  ['PUT',  /^\/users\/[^/]+$/,         'user_updated',         'user',         (_, d) => `Updated user: ${d.name ?? d.email ?? ''}`],
  ['POST', /^\/users\/[^/]+\/activate$/,   'user_activated',   'user',         () => 'User activated'],
  ['POST', /^\/users\/[^/]+\/deactivate$/, 'user_deactivated', 'user',         () => 'User deactivated'],
  ['DELETE', /^\/users\/[^/]+$/,       'user_deleted',         'user',         () => 'User deleted'],
  ['POST', /^\/users\/[^/]+\/reset-password$/, 'password_changed', 'user',    () => 'Password reset by admin'],
  ['PUT',  /^\/auth\/change-password$/, 'password_changed',    'auth',         () => 'Password changed'],
  // Customers
  ['POST', /^\/customers$/,            'customer_created',     'customer',     (_, d) => `Created customer: ${d.name ?? ''}`,    (d) => str(d.name)],
  ['PUT',  /^\/customers\/[^/]+$/,     'customer_updated',     'customer',     (_, d) => `Updated customer: ${d.name ?? ''}`,    (d) => str(d.name)],
  ['DELETE', /^\/customers\/[^/]+$/,   'customer_deleted',     'customer',     () => 'Customer deleted'],
  // Connections
  ['POST', /^\/connections$/,          'connection_created',   'connection',   (_, d) => `Created connection: ${d.accountNumber ?? ''}`, (d) => str(d.accountNumber)],
  ['PUT',  /^\/connections\/[^/]+$/,   'connection_updated',   'connection',   () => 'Connection updated'],
  ['POST', /^\/connections\/[^/]+\/suspend$/,  'connection_suspended',  'connection', () => 'Connection suspended'],
  ['POST', /^\/connections\/[^/]+\/activate$/, 'connection_activated',  'connection', () => 'Connection activated'],
  ['POST', /^\/connections\/[^/]+\/disconnect$/, 'connection_suspended', 'connection', () => 'Connection disconnected'],
  // Meters
  ['POST', /^\/meters$/,               'meter_created',        'meter',        (_, d) => `Registered meter: ${d.serialNumber ?? ''}`, (d) => str(d.serialNumber)],
  ['PUT',  /^\/meters\/[^/]+$/,        'meter_updated',        'meter',        (_, d) => `Updated meter: ${d.serialNumber ?? ''}`],
  ['POST', /^\/meters\/[^/]+\/assign$/, 'meter_updated',       'meter',        () => 'Meter assigned to property'],
  ['POST', /^\/meters\/[^/]+\/retire$/, 'meter_updated',       'meter',        () => 'Meter retired'],
  // Readings
  ['POST', /^\/meter-readings$/,       'reading_recorded',     'meter_reading', (_, d) => `Reading recorded: ${d.currentReading ?? d.readingValue ?? ''} m³`],
  ['POST', /^\/meter-readings\/bulk$/, 'reading_recorded',     'meter_reading', () => 'Bulk readings recorded'],
  // Bills
  ['POST', /^\/bills$/,                'bill_generated',       'bill',         () => 'Bill generated'],
  ['POST', /^\/bills\/[^/]+\/cancel$/, 'bill_cancelled',       'bill',         () => 'Bill cancelled'],
  // Payments
  ['POST', /^\/payments$/,             'payment_recorded',     'payment',      (_, d) => `Payment of ${d.amount ?? ''} recorded`],
  ['POST', /^\/payments\/[^/]+\/reverse$/, 'payment_reversed', 'payment',      () => 'Payment reversed'],
  // Tariffs
  ['POST', /^\/tariffs$/,              'tariff_created',       'tariff',       (_, d) => `Created tariff: ${d.name ?? ''}`,       (d) => str(d.name)],
  ['PUT',  /^\/tariffs\/[^/]+$/,       'tariff_updated',       'tariff',       (_, d) => `Updated tariff: ${d.name ?? ''}`],
  // Settings
  ['PUT',  /^\/settings$/,             'settings_updated',     'settings',     () => 'System settings updated'],
  ['POST', /^\/settings$/,             'settings_updated',     'settings',     () => 'System settings updated'],
];

function detectAuditEntry(res: AxiosResponse): AuditPayload | null {
  const method = (res.config.method ?? '').toUpperCase();
  const raw = (res.config.url ?? '').replace(/\?.*$/, '').replace(/^\/api\/v1/, '');
  const parts = raw.split('/').filter(Boolean);

  for (const [pm, re, action, resource, describe, getName] of AUDIT_PATTERNS) {
    if (pm !== method) continue;
    if (!re.test(raw)) continue;

    // Resource ID is typically the second segment when it's a UUID/slug
    const UUID_RE = /^[0-9a-f-]{8,}$|^\d+$/i;
    const resourceId = parts.length >= 2 && UUID_RE.test(parts[1]) ? parts[1] : undefined;

    const body = (res.data as Record<string, unknown>);
    const data = (body?.data ?? body) as Record<string, unknown>;

    return {
      action,
      resource,
      resourceId,
      resourceName: getName?.(data),
      description: describe(parts, data),
    };
  }
  return null;
}

// Register as second response interceptor — runs after camelCase conversion
apiClient.interceptors.response.use((res) => {
  // Skip the audit-logs endpoint itself to prevent infinite loops
  const url = res.config.url ?? '';
  if (url.includes('/audit-logs')) return res;

  const entry = detectAuditEntry(res);
  if (!entry) return res;

  const user = useAuthStore.getState().user;
  if (!user) return res;

  // Fire-and-forget — never blocks the original response
  apiClient.post('/audit-logs', {
    ...entry,
    userId:   user.id,
    userName: user.name,
    userRole: user.role,
  }).catch(() => {});

  return res;
});
