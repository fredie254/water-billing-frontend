import { apiClient, unwrapList } from '@/core/api/client';
import type { Meter, MeterReading, QueryParams } from '@/types';

function normalizeReading(raw: Record<string, unknown>): MeterReading {
  return {
    id:             raw.id as string,
    tenantId:       (raw.tenantId ?? '') as string,
    connectionId:   (raw.connectionId ?? '') as string,
    meterId:        (raw.meterId ?? '') as string,
    accountNumber:  raw.accountNumber as string | undefined,
    meterSerial:    raw.meterSerial as string | undefined,
    customerName:   raw.customerName as string | undefined,
    // API returns current_reading / previous_reading / units_consumed as strings
    readingValue:   Number(raw.currentReading  ?? raw.readingValue  ?? 0),
    previousReading: raw.previousReading != null ? Number(raw.previousReading) : undefined,
    unitsConsumed:  raw.unitsConsumed   != null ? Number(raw.unitsConsumed)   : undefined,
    readingDate:    (raw.readingDate ?? '') as string,
    readingType:    (raw.readingType ?? 'manual') as MeterReading['readingType'],
    readerName:     raw.readerName as string | undefined,
    notes:          raw.notes as string | undefined,
    // API uses is_flagged boolean + status string instead of flagged/validated
    flagged:        Boolean(raw.isFlagged ?? raw.flagged ?? false),
    flagReason:     (raw.flagReason ?? 'none') as MeterReading['flagReason'],
    flagNote:       raw.flagNote as string | undefined,
    validated:      raw.status === 'validated' || Boolean(raw.validated),
    validatedBy:    raw.validatedBy as string | undefined,
    createdAt:      (raw.createdAt ?? '') as string,
  };
}

export const metersApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/meters', { params }).then((r) => unwrapList<Meter>(r.data)),

  getOne: (id: string) =>
    apiClient.get(`/meters/${id}`).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Meter;
    }),

  create: (data: Partial<Meter>) =>
    apiClient.post('/meters', data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Meter;
    }),

  update: (id: string, data: Partial<Meter>) =>
    apiClient.put(`/meters/${id}`, data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Meter;
    }),

  retire: (id: string, data?: { reason?: string; replacedById?: string }) =>
    apiClient.post(`/meters/${id}/retire`, data ?? {}),

  logEvent: (id: string, data: { eventType: string; description: string; performedBy?: string; notes?: string }) =>
    apiClient.post(`/meters/${id}/event`, data).then((r) => r.data),

  assign: (id: string, data: { propertyId?: string; customerId?: string; installationLocation?: string }) =>
    apiClient.post(`/meters/${id}/assign`, data).then((r) => r.data),
};

export const readingsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/meter-readings', { params }).then((r) => {
      const raw = unwrapList<Record<string, unknown>>(r.data);
      return { ...raw, data: raw.data.map(normalizeReading) };
    }),

  getOne: (id: string) =>
    apiClient.get(`/meter-readings/${id}`).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as MeterReading;
    }),

  create: (data: Partial<MeterReading> & { meterId?: string; connectionId?: string }) =>
    apiClient.post('/meter-readings', data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as MeterReading;
    }),

  approve: (id: string) => apiClient.post(`/meter-readings/${id}/approve`),

  reject: (id: string, reason: string) =>
    apiClient.post(`/meter-readings/${id}/reject`, { reason }),

  bulkCreate: (data: { routeId: string; readingDate: string; readings: Array<{ meterId: string; connectionId: string; currentReading: number; notes?: string }> }) =>
    apiClient.post('/meter-readings/bulk', data).then((r) => r.data),
};
