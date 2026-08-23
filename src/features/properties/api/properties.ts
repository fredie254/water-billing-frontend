import { apiClient, unwrapList } from '@/core/api/client';
import type { Property, QueryParams } from '@/types';

const UNSET = new Set(['unassigned', 'n/a', 'none', '-', '']);

function normalizeProperty(raw: Record<string, unknown>): Property {
  const p = raw as unknown as Property;
  return {
    ...p,
    // API sometimes returns "unassigned" as a literal string — treat as absent
    customerName: p.customerName && !UNSET.has(p.customerName.toLowerCase().trim())
      ? p.customerName
      : undefined,
    occupantName: p.occupantName && !UNSET.has(p.occupantName.toLowerCase().trim())
      ? p.occupantName
      : undefined,
  };
}

export const propertiesApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/properties', { params }).then((r) => {
      const raw = unwrapList<Record<string, unknown>>(r.data);
      return { ...raw, data: raw.data.map(normalizeProperty) };
    }),

  getOne: (id: string) =>
    apiClient.get(`/properties/${id}`).then((r) => {
      const b = r.data as Record<string, unknown>;
      return normalizeProperty((b?.data ?? b) as Record<string, unknown>);
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
