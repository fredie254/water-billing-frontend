import { apiClient } from '@/core/api/client';
import type { InventoryItem, Asset, MaintenanceRecord, PaginatedResponse, QueryParams } from '@/types';

export const inventoryApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<InventoryItem>>('/inventory', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: InventoryItem }>(`/inventory/${id}`).then((r) => r.data.data),

  create: (data: Partial<InventoryItem>) =>
    apiClient.post<{ data: InventoryItem }>('/inventory', data).then((r) => r.data.data),

  update: (id: string, data: Partial<InventoryItem>) =>
    apiClient.put<{ data: InventoryItem }>(`/inventory/${id}`, data).then((r) => r.data.data),

  adjust: (id: string, adjustment: number, reason: string) =>
    apiClient.post(`/inventory/${id}/adjust`, { adjustment, reason }).then((r) => r.data),
};

export const assetsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Asset>>('/assets', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Asset }>(`/assets/${id}`).then((r) => r.data.data),

  create: (data: Partial<Asset>) =>
    apiClient.post<{ data: Asset }>('/assets', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Asset>) =>
    apiClient.put<{ data: Asset }>(`/assets/${id}`, data).then((r) => r.data.data),
};

export const maintenanceApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<MaintenanceRecord>>('/maintenance-records', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: MaintenanceRecord }>(`/maintenance-records/${id}`).then((r) => r.data.data),

  create: (data: Partial<MaintenanceRecord>) =>
    apiClient.post<{ data: MaintenanceRecord }>('/maintenance-records', data).then((r) => r.data.data),

  update: (id: string, data: Partial<MaintenanceRecord>) =>
    apiClient.put<{ data: MaintenanceRecord }>(`/maintenance-records/${id}`, data).then((r) => r.data.data),
};
