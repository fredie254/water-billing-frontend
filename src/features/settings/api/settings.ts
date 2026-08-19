import { apiClient } from '@/core/api/client';

export const settingsApi = {
  getAll: () => apiClient.get('/settings').then((r) => r.data.data),

  updateOrganisation: (data: Record<string, unknown>) =>
    apiClient.put('/settings/organisation', data).then((r) => r.data),

  updateBilling: (data: Record<string, unknown>) =>
    apiClient.put('/settings/billing', data).then((r) => r.data),

  updateNotifications: (data: Record<string, unknown>) =>
    apiClient.put('/settings/notifications', data).then((r) => r.data),

  updateIntegrations: (data: Record<string, unknown>) =>
    apiClient.put('/settings/integrations', data).then((r) => r.data),
};
