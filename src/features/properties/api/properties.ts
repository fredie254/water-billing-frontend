import { apiClient } from '@/core/api/client';
import type { Property, PaginatedResponse, QueryParams } from '@/types';

export const propertiesApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Property>>('/properties', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Property }>(`/properties/${id}`).then((r) => r.data.data),

  create: (data: Partial<Property>) =>
    apiClient.post<{ data: Property }>('/properties', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Property>) =>
    apiClient.put<{ data: Property }>(`/properties/${id}`, data).then((r) => r.data.data),

  activate: (id: string) => apiClient.post(`/properties/${id}/activate`),

  deactivate: (id: string) => apiClient.post(`/properties/${id}/deactivate`),
};
