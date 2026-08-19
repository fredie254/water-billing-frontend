import { apiClient } from '@/core/api/client';
import type { Zone, MeterRoute, PaginatedResponse, QueryParams } from '@/types';

export const zonesApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Zone>>('/zones', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Zone }>(`/zones/${id}`).then((r) => r.data.data),

  create: (data: Partial<Zone>) =>
    apiClient.post<{ data: Zone }>('/zones', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Zone>) =>
    apiClient.put<{ data: Zone }>(`/zones/${id}`, data).then((r) => r.data.data),

  deactivate: (id: string) => apiClient.post(`/zones/${id}/deactivate`),

  getRoutes: (zoneId: string) =>
    apiClient.get<{ data: MeterRoute[] }>(`/zones/${zoneId}/routes`).then((r) => r.data.data),
};

export const routesApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<MeterRoute>>('/routes', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: MeterRoute }>(`/routes/${id}`).then((r) => r.data.data),

  create: (data: Partial<MeterRoute>) =>
    apiClient.post<{ data: MeterRoute }>('/routes', data).then((r) => r.data.data),

  update: (id: string, data: Partial<MeterRoute>) =>
    apiClient.put<{ data: MeterRoute }>(`/routes/${id}`, data).then((r) => r.data.data),

  assignReader: (id: string, readerId: string) =>
    apiClient.post(`/routes/${id}/assign-reader`, { readerId }),
};
