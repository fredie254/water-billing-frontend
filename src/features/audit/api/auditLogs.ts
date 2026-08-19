import { apiClient } from '@/core/api/client';
import type { AuditLog, PaginatedResponse, QueryParams } from '@/types';

export const auditLogsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs', { params }).then((r) => r.data),

  export: (params: Record<string, string>) =>
    apiClient.get('/audit-logs/export', { params, responseType: 'blob' }).then((r) => r.data),
};
