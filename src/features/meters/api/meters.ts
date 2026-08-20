import { apiClient } from '@/core/api/client';
import type { Meter, MeterReading, PaginatedResponse, QueryParams } from '@/types';

export const metersApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Meter>>('/meters', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Meter }>(`/meters/${id}`).then((r) => r.data.data),

  create: (data: Partial<Meter>) =>
    apiClient.post<{ data: Meter }>('/meters', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Meter>) =>
    apiClient.put<{ data: Meter }>(`/meters/${id}`, data).then((r) => r.data.data),

  retire: (id: string, data?: { reason?: string; replacedById?: string }) =>
    apiClient.post(`/meters/${id}/retire`, data ?? {}),

  logEvent: (id: string, data: { eventType: string; description: string; performedBy?: string; notes?: string }) =>
    apiClient.post(`/meters/${id}/event`, data).then((r) => r.data),

  assign: (id: string, data: { propertyId?: string; customerId?: string; installationLocation?: string }) =>
    apiClient.post(`/meters/${id}/assign`, data).then((r) => r.data),
};

export const readingsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<MeterReading>>('/meter-readings', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: MeterReading }>(`/meter-readings/${id}`).then((r) => r.data.data),

  create: (data: Partial<MeterReading> & { meterId?: string; connectionId?: string }) =>
    apiClient.post<{ data: MeterReading }>('/meter-readings', data).then((r) => r.data.data),

  approve: (id: string) => apiClient.post(`/meter-readings/${id}/approve`),

  reject: (id: string, reason: string) =>
    apiClient.post(`/meter-readings/${id}/reject`, { reason }),

  bulkCreate: (data: { routeId: string; readingDate: string; readings: Array<{ meterId: string; connectionId: string; currentReading: number; notes?: string }> }) =>
    apiClient.post('/meter-readings/bulk', data).then((r) => r.data),
};
