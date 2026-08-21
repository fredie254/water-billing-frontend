import { apiClient, unwrapList } from '@/core/api/client';
import type { Bill, Connection, Tariff, QueryParams } from '@/types';

export const billsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/invoices', { params }).then((r) => unwrapList<Bill>(r.data)),

  getOne: (id: string) =>
    apiClient.get<{ data: Bill }>(`/invoices/${id}`).then((r) => r.data.data),

  generate: (data: {
    connectionId: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    currentReading?: number;
    dueDate: string;
    discountPercent?: number;
    penaltyAmount?: number;
    notes?: string;
  }) =>
    apiClient.post<{ data: Bill }>('/invoices/generate', data).then((r) => r.data.data),

  bulkGenerate: (data: {
    billingPeriodStart: string;
    billingPeriodEnd: string;
    dueDate: string;
    zoneId?: string;
  }) =>
    apiClient.post('/invoices/bulk-generate', data).then((r) => r.data),

  voidBill: (id: string, reason: string) =>
    apiClient.post(`/invoices/${id}/void`, { reason }),

  send: (id: string) => apiClient.post(`/invoices/${id}/send`),

  downloadPdf: (id: string) =>
    apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};

function normalizeConnection(raw: Record<string, unknown>): Connection {
  const meter    = raw.meter    as Record<string, unknown> | null;
  const customer = raw.customer as Record<string, unknown> | null;
  const tariff   = raw.tariff   as Record<string, unknown> | null;
  const connTypeMap: Record<string, Connection['connectionType']> = {
    residential: 'domestic', domestic: 'domestic',
    commercial: 'commercial', industrial: 'industrial', bulk: 'bulk',
  };
  const rawType = String(raw.connectionType ?? 'domestic').toLowerCase();
  return {
    id:             raw.id as string,
    tenantId:       (raw.tenantId ?? '') as string,
    propertyId:     (raw.propertyId ?? '') as string,
    propertyAddress: raw.propertyAddress as string | undefined,
    meterId:        (raw.meterId ?? '') as string,
    meterSerial:    (meter?.serialNumber ?? meter?.serial ?? meter?.meterSerial ?? raw.meterSerial) as string | undefined,
    customerId:     (raw.customerId ?? '') as string,
    customerName:   (customer?.name ?? customer?.fullName ?? raw.customerName) as string | undefined,
    customerNo:     (customer?.customerNo ?? raw.customerNo) as string | undefined,
    accountNumber:  (raw.accountNumber ?? '') as string,
    connectionType: connTypeMap[rawType] ?? 'domestic',
    tariffId:       (raw.tariffId ?? '') as string,
    tariffName:     (tariff?.name ?? raw.tariffName) as string | undefined,
    deposit:        raw.deposit != null ? Number(raw.deposit) : undefined,
    status:         (raw.status ?? 'active') as Connection['status'],
    connectedAt:    (raw.connectedAt ?? '') as string,
    createdAt:      (raw.createdAt ?? '') as string,
  };
}

export const connectionsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/connections', { params }).then((r) => {
      const raw = unwrapList<Record<string, unknown>>(r.data);
      return { ...raw, data: raw.data.map(normalizeConnection) };
    }),

  getOne: (id: string) =>
    apiClient.get<{ data: Connection }>(`/connections/${id}`).then((r) => r.data.data),

  create: (data: Partial<Connection>) =>
    apiClient.post<{ data: Connection }>('/connections', data).then((r) => r.data.data),

  update: (id: string, data: { tariffId?: string; routeId?: string; zoneId?: string; deposit?: number; status?: string }) =>
    apiClient.put<{ data: Connection }>(`/connections/${id}`, data).then((r) => r.data.data),

  suspend: (id: string, reason: string) =>
    apiClient.post(`/connections/${id}/suspend`, { reason }),

  activate: (id: string) => apiClient.post(`/connections/${id}/activate`),

  disconnect: (id: string) => apiClient.post(`/connections/${id}/disconnect`),
};

export const tariffsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/tariffs', { params }).then((r) => unwrapList<Tariff>(r.data)),

  getOne: (id: string) =>
    apiClient.get<{ data: Tariff }>(`/tariffs/${id}`).then((r) => r.data.data),

  create: (data: Partial<Tariff> & { blocks: Array<{ fromUnits: number; toUnits: number | null; ratePerUnit: number }> }) =>
    apiClient.post<{ data: Tariff }>('/tariffs', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Tariff>) =>
    apiClient.put<{ data: Tariff }>(`/tariffs/${id}`, data).then((r) => r.data.data),

  deactivate: (id: string) => apiClient.post(`/tariffs/${id}/deactivate`),
};
