import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Download, Send, Ban, Printer, CheckCircle,
  AlertCircle, XCircle, Clock, User, Building2, Gauge, FileText,
} from 'lucide-react';
import { triggerPrint } from '@/shared/utils/printUtils';
import { Badge } from '@/shared/components/ui/Badge';
import { formatCurrency, formatDate, formatDateTime } from '@/shared/utils/utils';
import { billsApi } from '@/features/billing/api/billing';
import type { BillStatus, Bill, Payment } from '@/types';

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BillStatus, { label: string; variant: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     variant: 'gray',   icon: <FileText className="w-4 h-4" /> },
  pending:   { label: 'Pending',   variant: 'yellow', icon: <Clock className="w-4 h-4" /> },
  issued:    { label: 'Issued',    variant: 'blue',   icon: <Send className="w-4 h-4" /> },
  paid:      { label: 'Paid',      variant: 'green',  icon: <CheckCircle className="w-4 h-4" /> },
  partial:   { label: 'Partial',   variant: 'yellow', icon: <AlertCircle className="w-4 h-4" /> },
  overdue:   { label: 'Overdue',   variant: 'red',    icon: <XCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', variant: 'gray',   icon: <XCircle className="w-4 h-4" /> },
  void:      { label: 'Void',      variant: 'gray',   icon: <XCircle className="w-4 h-4" /> },
};

const LINE_TYPE_COLOR: Record<string, string> = {
  water:    'text-blue-700',
  fixed:    'text-gray-700',
  sewerage: 'text-teal-700',
  penalty:  'text-orange-700',
  discount: 'text-green-700',
  tax:      'text-purple-700',
  other:    'text-gray-700',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDisplayItems(bill: Bill) {
  if (bill.items && bill.items.length > 0) return bill.items;

  // Fallback: synthesise from scalar fields
  const items = [];
  if (bill.consumptionCharge > 0) {
    items.push({ id: 'f-w', billId: bill.id, description: 'Water consumption', quantity: bill.unitsConsumed, rate: +(bill.consumptionCharge / bill.unitsConsumed).toFixed(4), amount: bill.consumptionCharge, type: 'water' as const });
  }
  if (bill.standingCharge > 0) {
    items.push({ id: 'f-sc', billId: bill.id, description: 'Standing Charge', quantity: 1, rate: bill.standingCharge, amount: bill.standingCharge, type: 'fixed' as const });
  }
  if ((bill.sewerageCharge ?? 0) > 0) {
    items.push({ id: 'f-sw', billId: bill.id, description: 'Sewerage Surcharge', quantity: 1, rate: bill.sewerageCharge!, amount: bill.sewerageCharge!, type: 'sewerage' as const });
  }
  if (bill.penalties > 0) {
    items.push({ id: 'f-pen', billId: bill.id, description: 'Late Payment Penalty', quantity: 1, rate: bill.penalties, amount: bill.penalties, type: 'penalty' as const });
  }
  if ((bill.discounts ?? 0) > 0) {
    items.push({ id: 'f-disc', billId: bill.id, description: 'Discount', quantity: 1, rate: -bill.discounts!, amount: -bill.discounts!, type: 'discount' as const });
  }
  if ((bill.vatAmount ?? 0) > 0) {
    items.push({ id: 'f-vat', billId: bill.id, description: `VAT (${bill.vatRate ?? 0}%)`, quantity: 1, rate: bill.vatAmount!, amount: bill.vatAmount!, type: 'tax' as const });
  }
  return items;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const BillDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Void modal state
  const [showVoidPrompt, setShowVoidPrompt] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  // Send loading state
  const [sendLoading, setSendLoading] = useState(false);

  // PDF download loading state
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchBill = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await billsApi.getOne(id);
      setBill(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        console.error('Failed to fetch bill', err);
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!id || !bill) return;
    setPdfLoading(true);
    try {
      const blob = await billsApi.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bill.billNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSend = async () => {
    if (!id) return;
    setSendLoading(true);
    try {
      await billsApi.send(id);
      await fetchBill();
    } catch (err) {
      console.error('Failed to send bill', err);
    } finally {
      setSendLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!id || !voidReason.trim()) return;
    setVoidLoading(true);
    try {
      await billsApi.voidBill(id, voidReason.trim());
      setShowVoidPrompt(false);
      setVoidReason('');
      await fetchBill();
    } catch (err) {
      console.error('Failed to void bill', err);
    } finally {
      setVoidLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 animate-pulse" />
        <p>Loading bill…</p>
      </div>
    );
  }

  if (notFound || !bill) {
    return (
      <div className="py-20 text-center text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Bill not found.</p>
      </div>
    );
  }

  // payments come embedded on the bill from the API (bill.payments) or empty array
  const payments: Payment[] = (bill as any).payments ?? [];
  const cfg = STATUS_CONFIG[bill.status];
  const displayItems = buildDisplayItems(bill);
  const waterItems = displayItems.filter((i) => i.type === 'water');
  const otherItems = displayItems.filter((i) => i.type !== 'water');

  const collectionPercent = bill.totalAmount > 0
    ? Math.min(100, (bill.amountPaid / bill.totalAmount) * 100)
    : 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb — hidden on print */}
      <div className="flex items-center gap-2 text-sm no-print">
        <button
          onClick={() => navigate('/bills')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" /> Bills
        </button>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">{bill.billNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{bill.billNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-sm font-medium">
                {cfg.icon}
              </span>
              <Badge label={cfg.label} variant={cfg.variant as any} />
              {bill.issuedAt && (
                <span className="text-xs text-gray-400">Issued {formatDate(bill.issuedAt)}</span>
              )}
            </div>
          </div>
        </div>
        {/* Action buttons — hidden on print */}
        <div className="flex items-center gap-2 flex-wrap no-print">
          <button onClick={triggerPrint} className="btn-secondary btn-sm flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="btn-secondary btn-sm flex items-center gap-1.5"
            title="Download PDF"
          >
            <Download className="w-4 h-4" /> {pdfLoading ? 'Downloading…' : 'PDF'}
          </button>
          {bill.status !== 'paid' && bill.status !== 'void' && bill.status !== 'cancelled' && (
            <button
              onClick={handleSend}
              disabled={sendLoading}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" /> {sendLoading ? 'Sending…' : 'Send to Customer'}
            </button>
          )}
          {bill.status !== 'void' && bill.status !== 'paid' && (
            <button
              onClick={() => setShowVoidPrompt(true)}
              className="btn-danger btn-sm flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" /> Void
            </button>
          )}
        </div>
      </div>

      {/* Invoice card — print quality */}
      <div className="card overflow-hidden">
        {/* Gradient header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-primary-50">
          <div className="flex justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bill To</p>
              <p className="text-xl font-bold text-gray-900">{bill.customerName}</p>
              <p className="text-sm text-gray-600">Account No: <span className="font-mono font-semibold">{bill.accountNumber}</span></p>
              {bill.propertyAddress && <p className="text-sm text-gray-500 mt-0.5">{bill.propertyAddress}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Invoice</p>
              <p className="text-xl font-bold font-mono text-primary-700">{bill.billNumber}</p>
              <p className="text-sm text-gray-500">Billing Period: {formatDate(bill.billingPeriodStart)} – {formatDate(bill.billingPeriodEnd)}</p>
              <p className="text-sm text-gray-500">Due Date: <span className={bill.status === 'overdue' ? 'text-red-600 font-semibold' : ''}>{formatDate(bill.dueDate)}</span></p>
            </div>
          </div>
        </div>

        {/* Connection info */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-200 bg-gray-50">
          {[
            { icon: <Gauge className="w-4 h-4 text-blue-500" />, label: 'Meter', value: bill.meterSerial ?? '—' },
            { icon: <Building2 className="w-4 h-4 text-purple-500" />, label: 'Tariff', value: bill.tariffName ?? '—' },
            { icon: <User className="w-4 h-4 text-green-500" />, label: 'Consumption', value: `${bill.unitsConsumed.toFixed(2)} m³` },
          ].map((item) => (
            <div key={item.label} className="p-3 flex items-center gap-2">
              {item.icon}
              <div>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reading summary */}
        <div className="p-4 border-b border-gray-100 bg-blue-50/30">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Previous Reading: </span>
              <span className="font-mono font-semibold">{bill.previousReading.toFixed(2)} m³</span>
            </div>
            <span className="text-gray-300">→</span>
            <div>
              <span className="text-gray-500">Current Reading: </span>
              <span className="font-mono font-semibold">{bill.currentReading.toFixed(2)} m³</span>
            </div>
            <span className="text-gray-300">=</span>
            <div>
              <span className="text-gray-500">Consumed: </span>
              <span className="font-mono font-bold text-blue-700">{bill.unitsConsumed.toFixed(2)} m³</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-1/2">Description</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Qty / Units</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Water IBT blocks */}
              {waterItems.length > 0 && (
                <>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50/60 uppercase tracking-wider">
                      Water Charges — Increasing Block Tariff
                    </td>
                  </tr>
                  {waterItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className={`px-4 py-2.5 ${LINE_TYPE_COLOR[item.type ?? 'other']}`}>{item.description}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">KES {Math.abs(item.rate).toFixed(2)}/m³</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${LINE_TYPE_COLOR[item.type ?? 'other']}`}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {/* Other items */}
              {otherItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className={`px-4 py-2.5 ${LINE_TYPE_COLOR[item.type ?? 'other']}`}>{item.description}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {item.type === 'discount' ? `−${formatCurrency(Math.abs(item.rate))}` : formatCurrency(Math.abs(item.rate))}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${LINE_TYPE_COLOR[item.type ?? 'other']}`}>
                    {item.amount < 0 ? `−${formatCurrency(Math.abs(item.amount))}` : formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals */}
            <tfoot className="border-t-2 border-gray-200">
              {bill.discounts != null && bill.discounts > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Subtotal before discount</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-700">
                    {formatCurrency(bill.totalAmount + bill.discounts)}
                  </td>
                </tr>
              )}
              {bill.vatAmount != null && bill.vatAmount > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-4 py-2 text-right text-gray-600">
                    VAT ({bill.vatRate ?? 0}%)
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-purple-700">
                    {formatCurrency(bill.vatAmount)}
                  </td>
                </tr>
              )}
              <tr className="bg-primary-50">
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-primary-900 text-base">Total Due</td>
                <td className="px-4 py-3 text-right font-bold text-primary-900 text-lg">
                  {formatCurrency(bill.totalAmount)}
                </td>
              </tr>
              <tr className="bg-green-50">
                <td colSpan={3} className="px-4 py-3 text-right font-medium text-green-800">Amount Paid</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">
                  {formatCurrency(bill.amountPaid)}
                </td>
              </tr>
              <tr className={bill.balance > 0 ? 'bg-red-50' : 'bg-gray-50'}>
                <td colSpan={3} className={`px-4 py-3 text-right font-bold text-base ${bill.balance > 0 ? 'text-red-800' : 'text-gray-700'}`}>
                  Balance Outstanding
                </td>
                <td className={`px-4 py-3 text-right font-bold text-lg ${bill.balance > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                  {formatCurrency(bill.balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment progress bar */}
        {bill.totalAmount > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Payment Progress</span>
              <span>{collectionPercent.toFixed(0)}% collected</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${collectionPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment History — hidden on print */}
      <div className="card no-print">
        <div className="card-header">
          <h2 className="text-base font-semibold text-gray-900">Payment History</h2>
          <button
            onClick={() => navigate('/payments')}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            Record Payment
          </button>
        </div>
        <div className="card-body p-0">
          {payments.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              No payments recorded for this bill.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Receipt #</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Reference</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-primary-600">{p.paymentNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(p.paidAt)}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{p.paymentMethod.replace('_', ' ')}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {p.mpesaCode ?? p.reference ?? p.chequeNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge label={p.status} variant={p.status === 'completed' ? 'green' : p.status === 'failed' ? 'red' : 'yellow'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center pb-4">
        RUMAWASCO Water Management System · Generated {formatDate(bill.createdAt)}
        {bill.tariffName && ` · Tariff: ${bill.tariffName}`}
      </p>

      {/* ── Void confirmation prompt ── */}
      {showVoidPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Void Bill</h3>
            <p className="text-sm text-gray-500">Please provide a reason for voiding this bill. This action cannot be undone.</p>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={3}
              placeholder="Reason for voiding…"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowVoidPrompt(false); setVoidReason(''); }}
                className="btn-secondary btn-sm"
                disabled={voidLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={voidLoading || !voidReason.trim()}
                className="btn-danger btn-sm"
              >
                {voidLoading ? 'Voiding…' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
