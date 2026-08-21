import { apiClient, unwrapList } from '@/core/api/client';
import type { Connection, QueryParams } from '@/types';

function normalizeConnection(raw: Record<string, unknown>): Connection {
  const meter    = raw.meter    as Record<string, unknown> | null;
  const customer = raw.customer as Record<string, unknown> | null;
  const tariff   = raw.tariff   as Record<string, unknown> | null;
  const connTypeMap: Record<string, Connection['connectionType']> = {
    residential: 'domestic', domestic: 'domestic',
    commercial: 'commercial', industrial: 'industrial', bulk: 'bulk',
  };
  const rawType = String(raw.connectionType ?? 'domestic').toLowerCase();
  return {
    id:              raw.id as string,
    tenantId:        (raw.tenantId ?? '') as string,
    propertyId:      (raw.propertyId ?? '') as string,
    propertyAddress: raw.propertyAddress as string | undefined,
    meterId:         (raw.meterId ?? '') as string,
    meterSerial:     (meter?.serialNumber ?? meter?.serial ?? meter?.meterSerial ?? raw.meterSerial) as string | undefined,
    customerId:      (raw.customerId ?? '') as string,
    customerName:    (customer?.name ?? customer?.fullName ?? raw.customerName) as string | undefined,
    customerNo:      (customer?.customerNo ?? raw.customerNo) as string | undefined,
    accountNumber:   (raw.accountNumber ?? '') as string,
    connectionType:  connTypeMap[rawType] ?? 'domestic',
    tariffId:        (raw.tariffId ?? '') as string,
    tariffName:      (tariff?.name ?? raw.tariffName) as string | undefined,
    deposit:         raw.deposit != null ? Number(raw.deposit) : undefined,
    status:          (raw.status ?? 'active') as Connection['status'],
    connectedAt:     (raw.connectedAt ?? '') as string,
    createdAt:       (raw.createdAt ?? '') as string,
  };
}

export const connectionsApi = {
  list: (params?: QueryParams) =>
    apiClient.get('/connections', { params }).then((r) => {
      const raw = unwrapList<Record<string, unknown>>(r.data);
      return { ...raw, data: raw.data.map(normalizeConnection) };
    }),

  getOne: (id: string) =>
    apiClient.get<{ data: Connection }>(`/connections/${id}`).then((r) => r.data.data),
};
