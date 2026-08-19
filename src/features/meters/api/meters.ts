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

  retire: (id: string) => apiClient.post(`/meters/${id}/retire`),
};

export const readingsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<MeterReading>>('/meter-readings', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: MeterReading }>(`/meter-readings/${id}`).then((r) => r.data.data),

  create: (data: Partial<MeterReading>) =>
    apiClient.post<{ data: MeterReading }>('/meter-readings', data).then((r) => r.data.data),

  approve: (id: string) => apiClient.post(`/meter-readings/${id}/approve`),

  reject: (id: string, reason: string) =>
    apiClient.post(`/meter-readings/${id}/reject`, { reason }),

  bulkCreate: (readings: Partial<MeterReading>[]) =>
    apiClient.post('/meter-readings/bulk', { readings }).then((r) => r.data),
};
