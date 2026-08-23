import { apiClient } from '@/core/api/client';
import type { DashboardStats, RevenueDataPoint, ConsumptionDataPoint } from '@/types';

function normalizeConsumption(raw: Record<string, unknown>): ConsumptionDataPoint {
  return {
    // API may return period, billing_month, month_label, or month
    month: (raw.month ?? raw.period ?? raw.billingMonth ?? raw.monthLabel ?? raw.label ?? '') as string,
    // API may return total_consumption, units_consumed, total_units, volume, or units
    units: Number(raw.units ?? raw.totalConsumption ?? raw.unitsConsumed ?? raw.totalUnits ?? raw.consumption ?? raw.volume ?? 0),
    connections: Number(raw.connections ?? raw.activeConnections ?? raw.totalConnections ?? 0),
  };
}

function normalizeRevenue(raw: Record<string, unknown>): RevenueDataPoint {
  return {
    month: (raw.month ?? raw.period ?? raw.billingMonth ?? raw.label ?? '') as string,
    revenue: Number(raw.revenue ?? raw.totalBilled ?? raw.billed ?? raw.totalRevenue ?? 0),
    collected: Number(raw.collected ?? raw.totalCollected ?? raw.paid ?? 0),
    outstanding: Number(raw.outstanding ?? raw.totalOutstanding ?? raw.balance ?? 0),
  };
}

export const reportsApi = {
  getDashboardStats: () =>
    apiClient.get<{ data: DashboardStats }>('/reports/dashboard').then((r) => r.data.data),

  getRevenueTrend: (params?: { months?: number }) =>
    apiClient.get('/reports/revenue-trend', { params }).then((r) => {
      const raw = r.data as Record<string, unknown>;
      const arr = (Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : []) as Record<string, unknown>[];
      return arr.map(normalizeRevenue);
    }),

  getConsumptionTrend: (params?: { months?: number; zoneId?: string }) =>
    apiClient.get('/reports/consumption-trend', { params }).then((r) => {
      const raw = r.data as Record<string, unknown>;
      const arr = (Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : []) as Record<string, unknown>[];
      return arr.map(normalizeConsumption);
    }),

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
