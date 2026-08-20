import { apiClient } from '@/core/api/client';
import type { DashboardStats, RevenueDataPoint, ConsumptionDataPoint } from '@/types';

export const reportsApi = {
  getDashboardStats: () =>
    apiClient.get<{ data: DashboardStats }>('/reports/dashboard').then((r) => r.data.data),

  getRevenueTrend: (params?: { months?: number }) =>
    apiClient.get<{ data: RevenueDataPoint[] }>('/reports/revenue-trend', { params }).then((r) => r.data.data),

  getConsumptionTrend: (params?: { months?: number; zoneId?: string }) =>
    apiClient.get<{ data: ConsumptionDataPoint[] }>('/reports/consumption-trend', { params }).then((r) => r.data.data),

  getRevenueByZone: () =>
    apiClient.get('/reports/revenue-by-zone').then((r) => r.data),

  getRevenueByCustomerType: () =>
    apiClient.get('/reports/revenue-by-customer-type').then((r) => r.data),

  getConsumptionByZone: () =>
    apiClient.get('/reports/consumption-by-zone').then((r) => r.data),

  getHighConsumers: (params?: { limit?: number; period?: string }) =>
    apiClient.get('/reports/high-consumers', { params }).then((r) => r.data),

  getBillingAging: () =>
    apiClient.get('/reports/aging').then((r) => r.data),

  getCollectionRate: (params?: { from?: string; to?: string; zoneId?: string }) =>
    apiClient.get('/reports/collection-rate', { params }).then((r) => r.data),

  getMeterStats: () =>
    apiClient.get('/reports/meter-stats').then((r) => r.data),

  exportBillingSummary: (params: { format: 'csv' | 'xlsx' | 'pdf'; from?: string; to?: string; zoneId?: string }) =>
    apiClient.get('/reports/billing-summary/export', { params, responseType: 'blob' }).then((r) => r.data),

  exportConsumption: (params: { format: 'csv' | 'xlsx' | 'pdf'; from?: string; to?: string; zoneId?: string }) =>
    apiClient.get('/reports/consumption/export', { params, responseType: 'blob' }).then((r) => r.data),

  exportRevenue: (params: { format: 'csv' | 'xlsx' | 'pdf'; from?: string; to?: string; zoneId?: string }) =>
    apiClient.get('/reports/revenue/export', { params, responseType: 'blob' }).then((r) => r.data),

  exportMeters: (params: { format: 'csv' | 'xlsx' | 'pdf'; from?: string; to?: string; zoneId?: string }) =>
    apiClient.get('/reports/meters/export', { params, responseType: 'blob' }).then((r) => r.data),
};
