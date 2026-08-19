import { apiClient } from '@/core/api/client';
import type { ServiceRequest, Complaint, PaginatedResponse, QueryParams } from '@/types';

export const serviceRequestsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<ServiceRequest>>('/service-requests', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: ServiceRequest }>(`/service-requests/${id}`).then((r) => r.data.data),

  create: (data: Partial<ServiceRequest>) =>
    apiClient.post<{ data: ServiceRequest }>('/service-requests', data).then((r) => r.data.data),

  update: (id: string, data: Partial<ServiceRequest>) =>
    apiClient.put<{ data: ServiceRequest }>(`/service-requests/${id}`, data).then((r) => r.data.data),

  assign: (id: string, assignedTo: string, notes?: string) =>
    apiClient.post(`/service-requests/${id}/assign`, { assignedTo, notes }),

  resolve: (id: string, resolution: string, resolvedAt?: string) =>
    apiClient.post(`/service-requests/${id}/resolve`, { resolution, resolvedAt }),

  close: (id: string) => apiClient.post(`/service-requests/${id}/close`),
};

export const complaintsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Complaint>>('/complaints', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Complaint }>(`/complaints/${id}`).then((r) => r.data.data),

  create: (data: Partial<Complaint>) =>
    apiClient.post<{ data: Complaint }>('/complaints', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Complaint>) =>
    apiClient.put<{ data: Complaint }>(`/complaints/${id}`, data).then((r) => r.data.data),

  resolve: (id: string, resolution: string) =>
    apiClient.post(`/complaints/${id}/resolve`, { resolution }),
};
