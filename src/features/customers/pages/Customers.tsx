import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, UserX, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { CustomerForm } from './CustomerForm';
import { customersApi } from '@/features/customers/api/customers';
import { formatCurrency, formatDate, cn } from '@/shared/utils/utils';
import { extractError } from '@/core/api/client';
import type { Customer, CustomerType } from '@/types';

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  residential:   'Residential',
  commercial:    'Commercial',
  industrial:    'Industrial',
  institutional: 'Institutional',
  government:    'Government',
  bulk:          'Bulk Water',
};

const CUSTOMER_TYPE_BADGE: Record<CustomerType, string> = {
  residential:   'badge-blue',
  commercial:    'badge-purple',
  industrial:    'badge-yellow',
  institutional: 'badge-green',
  government:    'badge-gray',
  bulk:          'badge-red',
};

export const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [total,     setTotal]         = useState(0);
  const [loading,   setLoading]       = useState(false);
  const [search,     setSearch]       = useState('');
  const [typeFilter, setTypeFilter]   = useState<CustomerType | ''>('');
  const [statusFilter, setStatusFilter] = useState<Customer['status'] | ''>('');
  const [showForm,   setShowForm]     = useState(false);
  const [toToggle,   setToToggle]     = useState<Customer | null>(null);
  const [page,       setPage]         = useState(1);
  const [fetchError, setFetchError]   = useState('');
  const PAGE_SIZE = 10;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params: Record<string, string | number> = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (search)       params.search = search;
      if (typeFilter)   params.customerType = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await customersApi.list(params);
      setCustomers(res.data);
      setTotal(res.pagination.total);
    } catch (err) {
      setFetchError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleStatus = async () => {
    if (!toToggle) return;
    try {
      if (toToggle.status === 'active') {
        await customersApi.suspend(toToggle.id);
      } else {
        await customersApi.activate(toToggle.id);
      }
      setToToggle(null);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to toggle customer status:', err);
      setToToggle(null);
    }
  };

  const handleNewCustomer = () => {
    setShowForm(false);
    fetchCustomers();
  };

  const columns: Column<Customer>[] = [
    {
      key: 'customerNo', header: 'Account #',
      render: (r) => <span className="font-medium text-primary-600 font-mono text-xs">{r.customerNo}</span>,
    },
    {
      key: 'name', header: 'Customer',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{r.name}</p>
          {r.companyName && r.companyName !== r.name && (
            <p className="text-xs text-gray-400">{r.companyName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'customerType', header: 'Type',
      render: (r) => r.customerType
        ? <span className={cn('badge', CUSTOMER_TYPE_BADGE[r.customerType])}>{CUSTOMER_TYPE_LABELS[r.customerType]}</span>
        : <span className="text-gray-400 text-xs">—</span>,
    },
    { key: 'phone', header: 'Phone', render: (r) => <span className="text-sm">{r.phone ?? '—'}</span> },
    { key: 'totalConnections', header: 'Connections', render: (r) => <span className="text-sm text-center">{r.totalConnections ?? 0}</span> },
    {
      key: 'outstandingBalance', header: 'Balance',
      render: (r) => (
        <span className={cn('text-sm font-medium', r.outstandingBalance && r.outstandingBalance > 0 ? 'text-red-600' : 'text-gray-700')}>
          {formatCurrency(r.outstandingBalance ?? 0)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <Badge label={r.status} /> },
    { key: 'createdAt', header: 'Joined', render: (r) => <span className="text-sm text-gray-600">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            title="View customer"
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${r.id}`); }}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            title={r.status === 'active' ? 'Deactivate' : 'Activate'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              r.status === 'active'
                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            )}
            onClick={(e) => { e.stopPropagation(); setToToggle(r); }}
          >
            {r.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Customer
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <select
          className="input-base w-44 text-sm"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as CustomerType | ''); setPage(1); }}
        >
          <option value="">All Types</option>
          {(Object.entries(CUSTOMER_TYPE_LABELS) as [CustomerType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          className="input-base w-36 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as Customer['status'] | ''); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {fetchError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          <span className="font-semibold">Failed to load customers:</span> {fetchError}
        </div>
      )}

      <DataTable
        data={customers}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by name, account, phone, email…"
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

      {/* New customer modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Register New Customer" size="lg">
        <CustomerForm onSuccess={handleNewCustomer} onCancel={() => setShowForm(false)} />
      </Modal>

      {/* Activate / Deactivate confirmation */}
      <ConfirmDialog
        open={!!toToggle}
        onClose={() => setToToggle(null)}
        onConfirm={handleToggleStatus}
        title={toToggle?.status === 'active' ? 'Deactivate Customer' : 'Activate Customer'}
        message={
          toToggle?.status === 'active'
            ? `Deactivating ${toToggle?.name} will prevent new bills from being generated for their connections. You can reactivate at any time.`
            : `Activating ${toToggle?.name} will restore their account to good standing.`
        }
        confirmLabel={toToggle?.status === 'active' ? 'Deactivate' : 'Activate'}
        confirmVariant={toToggle?.status === 'active' ? 'danger' : 'primary'}
      />
    </div>
  );
};
