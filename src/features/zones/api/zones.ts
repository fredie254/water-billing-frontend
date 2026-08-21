import { apiClient, unwrapList } from '@/core/api/client';
import type { Zone, MeterRoute, QueryParams } from '@/types';

export const zonesApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/zones', { params }).then((r) => unwrapList<Zone>(r.data)),

  getOne: (id: string) =>
    apiClient.get(`/zones/${id}`).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Zone;
    }),

  create: (data: Partial<Zone>) =>
    apiClient.post('/zones', data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Zone;
    }),

  update: (id: string, data: Partial<Zone>) =>
    apiClient.put(`/zones/${id}`, data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Zone;
    }),

  deactivate: (id: string) => apiClient.post(`/zones/${id}/deactivate`),

  getRoutes: (zoneId: string) =>
    apiClient.get(`/zones/${zoneId}/routes`).then((r) => unwrapList<MeterRoute>(r.data).data),
};

export const routesApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/routes', { params }).then((r) => unwrapList<MeterRoute>(r.data)),

  getOne: (id: string) =>
    apiClient.get(`/routes/${id}`).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as MeterRoute;
    }),

  create: (data: Partial<MeterRoute>) =>
    apiClient.post('/routes', data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as MeterRoute;
    }),

  update: (id: string, data: Partial<MeterRoute>) =>
    apiClient.put(`/routes/${id}`, data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as MeterRoute;
    }),

  assignReader: (id: string, readerId: string) =>
    apiClient.post(`/routes/${id}/assign-reader`, { readerId }),
};
