import { apiClient, unwrapList } from '@/core/api/client';
import type { AuditLog, QueryParams } from '@/types';

export const auditLogsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/audit-logs', { params }).then((r) => unwrapList<AuditLog>(r.data)),

  export: (params: Record<string, string>) =>
    apiClient.get('/audit-logs/export', { params, responseType: 'blob' }).then((r) => r.data),
};
