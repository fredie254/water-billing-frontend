import { apiClient, unwrapList } from '@/core/api/client';
import type { Property, QueryParams } from '@/types';

export const propertiesApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/properties', { params }).then((r) => unwrapList<Property>(r.data)),

  getOne: (id: string) =>
    apiClient.get(`/properties/${id}`).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Property;
    }),

  create: (data: Partial<Property>) =>
    apiClient.post('/properties', data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Property;
    }),

  update: (id: string, data: Partial<Property>) =>
    apiClient.put(`/properties/${id}`, data).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Property;
    }),

  activate: (id: string) => apiClient.post(`/properties/${id}/activate`),
  deactivate: (id: string) => apiClient.post(`/properties/${id}/deactivate`),
};
