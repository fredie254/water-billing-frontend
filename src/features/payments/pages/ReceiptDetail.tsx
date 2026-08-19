import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Printer, CheckCircle, Smartphone, Building, Banknote, FileText, CreditCard, Loader2 } from 'lucide-react';
import { triggerPrint } from '@/shared/utils/printUtils';
import { receiptsApi } from '@/features/payments/api/receipts';
import { Badge } from '@/shared/components/ui/Badge';
import { formatCurrency, formatDate, formatDateTime } from '@/shared/utils/utils';
import type { PaymentMethod, Receipt as ReceiptType, ReceiptStatus } from '@/types';

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
  mpesa:         { label: 'M-Pesa',        icon: <Smartphone className="w-4 h-4 text-green-600" /> },
  cash:          { label: 'Cash',          icon: <Banknote className="w-4 h-4 text-yellow-600" /> },
  bank_transfer: { label: 'Bank Transfer', icon: <Building className="w-4 h-4 text-blue-600" /> },
  cheque:        { label: 'Cheque',        icon: <FileText className="w-4 h-4 text-purple-600" /> },
  card:          { label: 'Card',          icon: <CreditCard className="w-4 h-4 text-indigo-600" /> },
  other:         { label: 'Other',         icon: <FileText className="w-4 h-4 text-gray-600" /> },
};

const STATUS_CONFIG: Record<ReceiptStatus, { label: string; variant: string }> = {
  issued:  { label: 'Issued',  variant: 'green' },
  voided:  { label: 'Voided',  variant: 'red' },
  printed: { label: 'Printed', variant: 'blue' },
};

export const ReceiptDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    receiptsApi.getOne(id)
      .then((data) => setReceipt(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      const blob = await receiptsApi.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt?.receiptNumber ?? id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // errors surfaced by apiClient interceptor
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">
        <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin opacity-50" />
        <p>Loading receipt...</p>
      </div>
    );
  }

  if (notFound || !receipt) {
    return (
      <div className="py-20 text-center text-gray-400">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Receipt not found.</p>
      </div>
    );
  }

  const methodCfg = METHOD_CONFIG[receipt.paymentMethod];
  const statusCfg = STATUS_CONFIG[receipt.status];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb — hidden on print */}
      <div className="flex items-center gap-2 text-sm no-print">
        <button
          onClick={() => navigate('/receipts')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" /> Receipts
        </button>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">{receipt.receiptNumber}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{receipt.receiptNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge label={statusCfg.label} variant={statusCfg.variant as any} />
            <span className="text-xs text-gray-400">Issued {formatDate(receipt.issuedAt)}</span>
          </div>
        </div>
        {/* Hidden on print */}
        <div className="flex items-center gap-2 no-print">
          <button onClick={triggerPrint} className="btn-secondary btn-sm flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handleDownloadPdf}
            className="btn-secondary btn-sm flex items-center gap-1.5"
            title="Download as PDF"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Receipt card */}
      <div className="card overflow-hidden">
        {/* Header gradient */}
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Official Receipt</p>
              <p className="text-2xl font-bold font-mono text-green-700">{receipt.receiptNumber}</p>
            </div>
            <div className="text-right">
              <CheckCircle className="w-10 h-10 text-green-500 ml-auto mb-1" />
              <p className="text-xs text-gray-500">Payment Confirmed</p>
            </div>
          </div>
        </div>

        {/* Customer info */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Customer</p>
            <p className="font-semibold text-gray-900">{receipt.customerName}</p>
            <p className="text-xs font-mono text-gray-500 mt-0.5">Account: {receipt.accountNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Payment Method</p>
            <div className="flex items-center gap-1.5">
              {methodCfg.icon}
              <span className="font-medium text-gray-800">{methodCfg.label}</span>
            </div>
            {receipt.mpesaCode && (
              <p className="text-xs font-mono text-gray-500 mt-0.5">Code: {receipt.mpesaCode}</p>
            )}
            {receipt.reference && (
              <p className="text-xs font-mono text-gray-500 mt-0.5">Ref: {receipt.reference}</p>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Amount Received</p>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(receipt.amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Date</p>
              <p className="font-medium text-gray-800">{formatDate(receipt.issuedAt)}</p>
              <p className="text-xs text-gray-400">{formatDateTime(receipt.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Allocation breakdown */}
        <div className="p-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Allocation</p>
          <div className="space-y-2">
            {receipt.allocations.map((a) => (
              <div key={a.billId} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.description}</p>
                  <p className="text-xs font-mono text-primary-600">{a.billNumber}</p>
                </div>
                <p className="font-bold text-gray-900">{formatCurrency(a.allocatedAmount)}</p>
              </div>
            ))}

            {/* Summary */}
            <div className="pt-2 space-y-1">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-gray-600">Total Allocated</span>
                <span className="text-gray-900">
                  {formatCurrency(receipt.allocations.reduce((s, a) => s + a.allocatedAmount, 0))}
                </span>
              </div>
              {receipt.remainingBalance > 0 && (
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-yellow-700">Unallocated Surplus (credit)</span>
                  <span className="text-yellow-700">{formatCurrency(receipt.remainingBalance)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Outstanding balance after payment */}
        <div className="p-5 bg-green-50/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Account balance after payment</p>
            <p className={`font-bold text-lg ${receipt.remainingBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {receipt.remainingBalance > 0
                ? `+${formatCurrency(receipt.remainingBalance)} credit`
                : 'Cleared'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            RUMAWASCO Water Management System · This is a computer-generated receipt and requires no signature.
          </p>
        </div>
      </div>
    </div>
  );
};
