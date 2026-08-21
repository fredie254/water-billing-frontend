import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { connectionsApi } from '@/features/billing/api/billing';
import { customersApi } from '@/features/customers/api/customers';
import { metersApi } from '@/features/meters/api/meters';
import { tariffsApi } from '@/features/billing/api/billing';
import { formatCurrency, formatDate } from '@/shared/utils/utils';
import type { Connection, Customer, Meter, Tariff } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';

const connSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  meterId: z.string().min(1, 'Select a meter'),
  tariffId: z.string().min(1, 'Select a tariff'),
  connectionType: z.enum(['domestic', 'commercial', 'industrial', 'bulk']),
  deposit: z.number().min(0),
  connectedAt: z.string().min(1),
});
type ConnForm = z.infer<typeof connSchema>;

interface ConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ConnectionFormComponent = ({ onSuccess, onCancel }: ConnectionFormProps) => {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ConnForm>({
    resolver: zodResolver(connSchema),
    defaultValues: { connectionType: 'domestic', deposit: 2000, connectedAt: new Date().toISOString().split('T')[0] },
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  useEffect(() => {
    customersApi.list({ pageSize: 100 }).then((r) => setCustomers(r.data)).catch(() => {});
    metersApi.list({ pageSize: 100 }).then((r) => setMeters(r.data)).catch(() => {});
    tariffsApi.list({ pageSize: 100 }).then((r) => setTariffs(r.data)).catch(() => {});
  }, []);

  const tariffId = watch('tariffId');
  const tariff = tariffs.find((t) => t.id === tariffId);

  const onSubmit = async (data: ConnForm) => {
    await connectionsApi.create(data as Partial<Connection>);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Customer"
        {...register('customerId')}
        error={errors.customerId?.message}
        placeholder="Select customer"
        options={customers.map((c) => ({ value: c.id, label: `${c.customerNo} — ${c.name}` }))}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Meter"
          {...register('meterId')}
          error={errors.meterId?.message}
          placeholder="Select meter"
          options={meters.filter((m) => m.status !== 'faulty').map((m) => ({ value: m.id, label: `${m.serialNumber} (${m.brand ?? ''})` }))}
        />
        <Select
          label="Connection Type"
          {...register('connectionType')}
          options={[
            { value: 'domestic', label: 'Domestic' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'industrial', label: 'Industrial' },
            { value: 'bulk', label: 'Bulk Supply' },
          ]}
        />
        <Select
          label="Tariff Plan"
          {...register('tariffId')}
          error={errors.tariffId?.message}
          placeholder="Select tariff"
          options={tariffs.map((t) => ({ value: t.id, label: t.name }))}
        />
        <Input
          label="Security Deposit (KES)"
          {...register('deposit', { valueAsNumber: true })}
          type="number"
          placeholder="2000"
        />
        <Input
          label="Connection Date"
          {...register('connectedAt')}
          type="date"
          error={errors.connectedAt?.message}
        />
      </div>
      {tariff && (
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          Standing charge: <strong>{formatCurrency(tariff.standingCharge)}/mo</strong> · Min charge: <strong>{formatCurrency(tariff.minimumCharge)}</strong>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Create Connection</Button>
      </div>
    </form>
  );
};

export const Connections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, Customer>>({});
  const [meterMap, setMeterMap] = useState<Record<string, Meter>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchConnections = () => {
    setLoading(true);
    connectionsApi
      .list({ page, pageSize: PAGE_SIZE, search: search || undefined })
      .then(async (r) => {
        setConnections(r.data);

        // Resolve customer and meter details the API doesn't eager-load
        const customerIds = [...new Set(r.data.map((c) => c.customerId).filter(Boolean))];
        const meterIds    = [...new Set(r.data.map((c) => c.meterId).filter(Boolean))];

        const [custResults, meterResults] = await Promise.all([
          Promise.allSettled(customerIds.map((id) => customersApi.getOne(id))),
          Promise.allSettled(meterIds.map((id) => metersApi.getOne(id))),
        ]);

        const cMap: Record<string, Customer> = {};
        custResults.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value) cMap[customerIds[i]] = res.value;
        });

        const mMap: Record<string, Meter> = {};
        meterResults.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value) mMap[meterIds[i]] = res.value;
        });

        setCustomerMap(cMap);
        setMeterMap(mMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConnections();
  }, [page, search]);

  const filtered = connections.filter(
    (c) =>
      search === '' ||
      c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.accountNumber.includes(search) ||
      c.meterSerial?.includes(search)
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<Connection>[] = [
    {
      key: 'accountNumber', header: 'Account #',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-primary-600 font-mono text-xs">{r.accountNumber || '—'}</span>
        </div>
      ),
    },
    {
      key: 'customerName', header: 'Customer',
      render: (r) => {
        const c = customerMap[r.customerId];
        const name = c?.name ?? r.customerName;
        const no   = c?.customerNo;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{name ?? '—'}</span>
            {no && <span className="text-xs font-mono text-gray-400">{no}</span>}
          </div>
        );
      },
    },
    {
      key: 'meterSerial', header: 'Meter',
      render: (r) => {
        const m = meterMap[r.meterId];
        const serial = m?.serialNumber ?? r.meterSerial;
        const brand  = m?.brand;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-gray-800">{serial ?? '—'}</span>
            {brand && <span className="text-xs text-gray-400">{brand}</span>}
          </div>
        );
      },
    },
    { key: 'connectionType', header: 'Type', render: (r) => <span className="capitalize">{r.connectionType}</span> },
    { key: 'tariffName', header: 'Tariff', render: (r) => r.tariffName ?? '—' },
    { key: 'deposit', header: 'Deposit', render: (r) => formatCurrency(r.deposit ?? 0) },
    { key: 'status', header: 'Status', render: (r) => <Badge label={r.status} /> },
    { key: 'connectedAt', header: 'Connected', render: (r) => formatDate(r.connectedAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="text-sm text-gray-500 mt-0.5">{connections.length} connections</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Zap className="w-4 h-4" /> New Connection
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {(['active', 'suspended', 'disconnected'] as const).map((s) => (
          <button key={s} className="badge-gray px-3 py-1 cursor-pointer hover:bg-gray-200 capitalize text-xs">
            {s} ({connections.filter((c) => c.status === s).length})
          </button>
        ))}
      </div>

      <DataTable
        data={paginated}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search account, customer, meter…"
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Water Connection" size="lg">
        <ConnectionFormComponent
          onSuccess={() => { setShowForm(false); fetchConnections(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
};
