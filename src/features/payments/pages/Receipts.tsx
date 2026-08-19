import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Download, Printer, ChevronRight } from 'lucide-react';
import { DataTable, type Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { receiptsApi } from '@/features/payments/api/receipts';
import { formatCurrency, formatDate, cn } from '@/shared/utils/utils';
import type { Receipt as ReceiptType, ReceiptStatus, PaymentMethod } from '@/types';

const STATUS_CONFIG: Record<ReceiptStatus, { label: string; variant: string }> = {
  issued:  { label: 'Issued',  variant: 'green' },
  voided:  { label: 'Voided',  variant: 'red' },
  printed: { label: 'Printed', variant: 'blue' },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  mpesa: 'M-Pesa', cash: 'Cash', bank_transfer: 'Bank Transfer',
  cheque: 'Cheque', card: 'Card', other: 'Other',
};

export const Receipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (search) params.search = search;
      const res = await receiptsApi.list(params);
      setReceipts(res.data);
      setTotal(res.pagination.total);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleDownload = async (r: ReceiptType) => {
    try {
      const blob = await receiptsApi.downloadPdf(r.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${r.receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // errors surfaced by apiClient interceptor
    }
  };

  const totalIssued = receipts.reduce((s, r) => s + r.amount, 0);
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"

  const columns: Column<ReceiptType>[] = [
    {
      key: 'receiptNumber', header: 'Receipt #',
      render: (r) => (
        <button
          onClick={() => navigate(`/receipts/${r.paymentId}`)}
          className="font-mono font-medium text-primary-600 hover:underline"
        >
          {r.receiptNumber}
        </button>
      ),
    },
    { key: 'customerName', header: 'Customer', render: (r) => r.customerName ?? '—' },
    { key: 'accountNumber', header: 'Account', render: (r) => <span className="font-mono text-xs">{r.accountNumber ?? '—'}</span> },
    {
      key: 'paymentMethod', header: 'Method',
      render: (r) => <span className="text-sm text-gray-700">{METHOD_LABEL[r.paymentMethod]}</span>,
    },
    {
      key: 'amount', header: 'Amount',
      render: (r) => <span className="font-bold text-green-700">{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'allocations', header: 'Invoices Settled',
      render: (r) => (
        <div className="text-xs space-y-0.5">
          {r.allocations.map((a) => (
            <div key={a.billId}>
              <span className="font-mono text-primary-600">{a.billNumber}</span>
              {' '}— {formatCurrency(a.allocatedAmount)}
            </div>
          ))}
          {r.remainingBalance > 0 && (
            <div className="text-yellow-700 font-medium">+{formatCurrency(r.remainingBalance)} surplus</div>
          )}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const cfg = STATUS_CONFIG[r.status];
        return <Badge label={cfg.label} variant={cfg.variant as any} />;
      },
    },
    { key: 'issuedAt', header: 'Issued', render: (r) => formatDate(r.issuedAt) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(r); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Download / Save as PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/receipts/${r.paymentId}`)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
            title="Print receipt"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/receipts/${r.paymentId}`)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
            title="View"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Receipts', value: total, color: 'bg-blue-50', icon: <Receipt className="w-5 h-5 text-blue-500" /> },
          { label: 'Total Value', value: formatCurrency(totalIssued), color: 'bg-green-50', icon: <Receipt className="w-5 h-5 text-green-500" /> },
          { label: 'This Month', value: receipts.filter((r) => r.issuedAt.startsWith(currentMonth)).length, color: 'bg-purple-50', icon: <Receipt className="w-5 h-5 text-purple-500" /> },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={receipts}
        loading={loading}
        rowKey={(r) => r.id}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onRowClick={(r) => navigate(`/receipts/${r.paymentId}`)}
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />
    </div>
  );
};
