import { apiClient } from '@/core/api/client';
import type { Connection, PaginatedResponse, QueryParams } from '@/types';

export const connectionsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Connection>>('/connections', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Connection }>(`/connections/${id}`).then((r) => r.data.data),
};
