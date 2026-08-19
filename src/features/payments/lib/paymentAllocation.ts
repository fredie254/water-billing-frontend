import type { Bill, PaymentAllocation } from '@/types';

export interface AllocationResult {
  allocations: PaymentAllocation[];
  remaining: number;
  totalAllocated: number;
}

/**
 * Intelligent payment allocation:
 * 1. Bills with penalties first (overdue debt)
 * 2. Oldest outstanding invoice (by due date, ascending)
 * 3. Current / newest invoices last
 *
 * If payment exceeds all outstanding balances, the surplus is returned as `remaining`.
 */
export function allocatePayment(amount: number, bills: Bill[]): AllocationResult {
  const unpaid = bills.filter((b) => b.balance > 0);

  // Sort: penalty-bearing bills first, then oldest due date first
  const sorted = [...unpaid].sort((a, b) => {
    const aHasPenalty = a.penalties > 0 ? 0 : 1;
    const bHasPenalty = b.penalties > 0 ? 0 : 1;
    if (aHasPenalty !== bHasPenalty) return aHasPenalty - bHasPenalty;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  let remaining = +amount.toFixed(2);
  const allocations: PaymentAllocation[] = [];

  for (const bill of sorted) {
    if (remaining <= 0) break;

    const toAllocate = +(Math.min(remaining, bill.balance)).toFixed(2);

    let description = `Invoice ${bill.billNumber}`;
    if (bill.penalties > 0) description += ' (includes penalty)';
    const period = formatPeriod(bill.billingPeriodStart, bill.billingPeriodEnd);
    if (period) description += ` — ${period}`;

    allocations.push({
      billId: bill.id,
      billNumber: bill.billNumber,
      description,
      allocatedAmount: toAllocate,
    });

    remaining = +(remaining - toAllocate).toFixed(2);
  }

  return {
    allocations,
    remaining,
    totalAllocated: +(amount - remaining).toFixed(2),
  };
}

function formatPeriod(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
      return s.toLocaleString('en-KE', { month: 'short', year: 'numeric' });
    }
    return `${s.toLocaleString('en-KE', { month: 'short' })}–${e.toLocaleString('en-KE', { month: 'short', year: 'numeric' })}`;
  } catch {
    return '';
  }
}

/** Generate a sequential receipt number */
export function generateReceiptNumber(existing: { receiptNumber: string }[]): string {
  const year = new Date().getFullYear();
  const nums = existing
    .map((r) => {
      const m = r.receiptNumber.match(/RCT-(\d{4})-(\d+)/);
      return m ? parseInt(m[2]) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `RCT-${year}-${String(next).padStart(3, '0')}`;
}
