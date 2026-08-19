import { apiClient } from '@/core/api/client';
import type { DashboardStats, RevenueDataPoint, ConsumptionDataPoint } from '@/types';

export const reportsApi = {
  getDashboardStats: () =>
    apiClient.get<{ data: DashboardStats }>('/reports/dashboard').then((r) => r.data.data),

  getRevenueTrend: (params: { months?: number }) =>
    apiClient.get<{ data: RevenueDataPoint[] }>('/reports/revenue-trend', { params }).then((r) => r.data.data),

  getConsumptionTrend: (params: { months?: number }) =>
    apiClient.get<{ data: ConsumptionDataPoint[] }>('/reports/consumption-trend', { params }).then((r) => r.data.data),

  getBillingAging: (params?: Record<string, string>) =>
    apiClient.get('/reports/aging', { params }).then((r) => r.data),

  getCollectionRate: (params?: Record<string, string>) =>
    apiClient.get('/reports/collection-rate', { params }).then((r) => r.data),

  exportBillingSummary: (params: Record<string, string>) =>
    apiClient.get('/reports/billing-summary/export', { params, responseType: 'blob' }).then((r) => r.data),

  exportConsumption: (params: Record<string, string>) =>
    apiClient.get('/reports/consumption/export', { params, responseType: 'blob' }).then((r) => r.data),
};
