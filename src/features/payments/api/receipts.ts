import { apiClient, unwrapList } from '@/core/api/client';
import type { Receipt, QueryParams } from '@/types';

export const receiptsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/receipts', { params }).then((r) => unwrapList<Receipt>(r.data)),

  getOne: (id: string) =>
    apiClient.get(`/receipts/${id}`).then((r) => {
      const b = r.data as Record<string, unknown>;
      return (b?.data ?? b) as Receipt;
    }),

  downloadPdf: (id: string) =>
    apiClient.get(`/receipts/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data as Blob),
};
