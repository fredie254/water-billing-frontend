import { apiClient } from '@/core/api/client';
import type { Receipt, PaginatedResponse, QueryParams } from '@/types';

export const receiptsApi = {
  list: (params?: QueryParams) =>
    apiClient.get<PaginatedResponse<Receipt>>('/receipts', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<{ data: Receipt }>(`/receipts/${id}`).then((r) => r.data.data),

  downloadPdf: (id: string) =>
    apiClient.get(`/receipts/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};
