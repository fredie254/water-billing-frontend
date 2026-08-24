import { apiClient, unwrapList } from '@/core/api/client';
import type { Bill, Connection, Tariff, QueryParams, BillStatus } from '@/types';

function normalizeBill(raw: Record<string, unknown>): Bill {
  return {
    id:                 (raw.id ?? '') as string,
    tenantId:           (raw.tenantId ?? '') as string,
    connectionId:       (raw.connectionId ?? '') as string,
    accountNumber:      (raw.accountNumber ?? raw.account ?? raw.accountNo) as string | undefined,
    customerId:         (raw.customerId ?? '') as string,
    customerName:       (raw.customerName ?? raw.customer) as string | undefined,
    propertyId:         raw.propertyId as string | undefined,
    propertyAddress:    raw.propertyAddress as string | undefined,
    meterSerial:        raw.meterSerial as string | undefined,
    tariffId:           raw.tariffId as string | undefined,
    tariffName:         raw.tariffName as string | undefined,
    billingCycleId:     raw.billingCycleId as string | undefined,
    // API may return invoice_number, bill_no, invoice_no
    billNumber:         (raw.billNumber ?? raw.invoiceNumber ?? raw.billNo ?? raw.invoiceNo ?? raw.number ?? '') as string,
    billingPeriodStart: (raw.billingPeriodStart ?? raw.periodStart ?? raw.readingPeriodStart ?? '') as string,
    billingPeriodEnd:   (raw.billingPeriodEnd   ?? raw.periodEnd   ?? raw.readingPeriodEnd   ?? '') as string,
    dueDate:            (raw.dueDate ?? '') as string,
    previousReading:    Number(raw.previousReading ?? 0),
    currentReading:     Number(raw.currentReading  ?? 0),
    unitsConsumed:      Number(raw.unitsConsumed    ?? raw.consumption ?? raw.units ?? 0),
    consumptionCharge:  Number(raw.consumptionCharge ?? raw.waterCharge ?? raw.usageCharge ?? 0),
    standingCharge:     Number(raw.standingCharge   ?? raw.fixedCharge  ?? 0),
    sewerageCharge:     raw.sewerageCharge != null ? Number(raw.sewerageCharge) : undefined,
    penalties:          Number(raw.penalties ?? raw.penaltyAmount ?? raw.penalty ?? 0),
    adjustments:        Number(raw.adjustments ?? 0),
    discounts:          raw.discounts != null ? Number(raw.discounts) : undefined,
    vatRate:            raw.vatRate   != null ? Number(raw.vatRate)   : undefined,
    vatAmount:          raw.vatAmount != null ? Number(raw.vatAmount) : undefined,
    totalAmount:        Number(raw.totalAmount ?? raw.total ?? raw.amount ?? raw.invoiceAmount ?? 0),
    amountPaid:         Number(raw.amountPaid  ?? raw.paid  ?? raw.paidAmount ?? 0),
    // API may return outstanding_balance, amount_due, outstanding
    balance:            Number(raw.balance ?? raw.outstandingBalance ?? raw.amountDue ?? raw.outstanding ?? raw.remainingBalance ?? 0),
    status:             (raw.status ?? 'pending') as BillStatus,
    issuedAt:           raw.issuedAt as string | undefined,
    items:              (Array.isArray(raw.items) ? raw.items : []) as Bill['items'],
    createdAt:          (raw.createdAt ?? '') as string,
  };
}

// Shape returned by GET /invoices/form-data
export interface InvoiceFormData {
  accounts: Array<{
    id: string;
    accountNumber: string;
    customerName: string;
    customerId: string;
    meterId?: string;
    zoneId?: string;
    connectionType?: string;
  }>;
  billingPeriods: Array<{
    id: string;
    name: string;
    readingPeriodStart: string;
    readingPeriodEnd: string;
    billingDate?: string;
    dueDate?: string;
    status?: string;
  }>;
}

export const billsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/invoices', { params }).then((r) => {
      const raw = unwrapList<Record<string, unknown>>(r.data);
      return { ...raw, data: raw.data.map(normalizeBill) };
    }),

  getOne: (id: string) =>
    apiClient.get(`/invoices/${id}`).then((r) => {
      const b = r.data as Record<string, unknown>;
      return normalizeBill((b?.data ?? b) as Record<string, unknown>);
    }),

  getFormData: () =>
    apiClient.get('/invoices/form-data').then((r) => {
      const body = r.data as Record<string, unknown>;
      const d = (body?.data ?? body) as Record<string, unknown>;
      return {
        accounts:       (Array.isArray(d.accounts)       ? d.accounts       : []) as InvoiceFormData['accounts'],
        billingPeriods: (Array.isArray(d.billingPeriods) ? d.billingPeriods : []) as InvoiceFormData['billingPeriods'],
      } as InvoiceFormData;
    }),

  generate: (data: {
    connectionId: string;
    billingCycleId?: string;
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
