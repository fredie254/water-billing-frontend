import { apiClient, unwrapList } from '@/core/api/client';
import type { Connection, QueryParams } from '@/types';

export const connectionsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/connections', { params }).then((r) => unwrapList<Connection>(r.data)),

  getOne: (id: string) =>
    apiClient.get<{ data: Connection }>(`/connections/${id}`).then((r) => r.data.data),
};
