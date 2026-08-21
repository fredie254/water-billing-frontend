import { apiClient, unwrapList } from '@/core/api/client';
import type { Meter, MeterReading, QueryParams } from '@/types';

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
    apiClient.get('/meter-readings', { params }).then((r) => unwrapList<MeterReading>(r.data)),

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
