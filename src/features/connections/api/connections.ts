// connections API — wire to backend when endpoint is finalised
import { apiClient } from '@/core/api/client'
import type { QueryParams } from '@/types'

export const connectionsApi = {
  list: (params?: QueryParams) => apiClient.get('/connections', { params }).then((r) => r.data),
  getOne: (id: string) => apiClient.get(`/connections/${id}`).then((r) => r.data.data),
};
