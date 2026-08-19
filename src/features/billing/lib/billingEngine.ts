import type { TariffBlock, BillItem } from '@/types';

// ─── IBT (Increasing Block Tariff) calculation ────────────────────────────────

export interface IBTBlock {
  range: string;
  units: number;
  rate: number;
  amount: number;
}

export function calculateIBT(
  consumption: number,
  blocks: Pick<TariffBlock, 'fromUnits' | 'toUnits' | 'ratePerUnit'>[],
): { charge: number; breakdown: IBTBlock[] } {
  const sorted = [...blocks].sort((a, b) => a.fromUnits - b.fromUnits);
  let remaining = consumption;
  let total = 0;
  const breakdown: IBTBlock[] = [];

  for (const block of sorted) {
    if (remaining <= 0) break;
    const blockCapacity = block.toUnits != null ? block.toUnits - block.fromUnits : Infinity;
    const units = Math.min(remaining, blockCapacity);
    const amount = +(units * block.ratePerUnit).toFixed(2);
    breakdown.push({
      range: block.toUnits != null
        ? `${block.fromUnits}–${block.toUnits} m³`
        : `>${block.fromUnits} m³`,
      units: +units.toFixed(3),
      rate: block.ratePerUnit,
      amount,
    });
    total += amount;
    remaining -= units;
  }

  return { charge: +total.toFixed(2), breakdown };
}

// ─── Full bill calculation ────────────────────────────────────────────────────

export interface BillCalcConfig {
  consumption: number;
  tariff: {
    standingCharge: number;
    minimumCharge: number;
    penaltyRate: number;
    blocks: Pick<TariffBlock, 'fromUnits' | 'toUnits' | 'ratePerUnit'>[];
  };
  sewerageRate?: number;     // fraction of water charge, e.g. 0.60
  vatRate?: number;          // e.g. 0.16
  discountPercent?: number;  // e.g. 0.10
  penaltyAmount?: number;    // explicit overdue penalty
  arrearsBalance?: number;   // for auto-penalty calculation
}

export interface BillCalcResult {
  ibtBreakdown: IBTBlock[];
  consumptionCharge: number;
  standingCharge: number;
  waterSubtotal: number;
  sewerageCharge: number;
  penalties: number;
  subtotal: number;
  discounts: number;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export function calculateBill(config: BillCalcConfig): BillCalcResult {
  const {
    consumption,
    tariff,
    sewerageRate = 0,
    vatRate = 0,
    discountPercent = 0,
    penaltyAmount = 0,
    arrearsBalance = 0,
  } = config;

  // Water consumption charge (IBT)
  const { charge: rawConsumptionCharge, breakdown: ibtBreakdown } = calculateIBT(consumption, tariff.blocks);

  // Standing charge
  const standingCharge = tariff.standingCharge;

  // Water subtotal — enforce minimum charge
  const waterRaw = rawConsumptionCharge + standingCharge;
  const waterSubtotal = Math.max(waterRaw, tariff.minimumCharge);
  const consumptionCharge = +(waterSubtotal - standingCharge).toFixed(2);

  // Sewerage surcharge (% of water subtotal)
  const sewerageCharge = +(waterSubtotal * sewerageRate).toFixed(2);

  // Penalties — explicit amount, or auto-calculated from arrears
  const penalties = penaltyAmount > 0
    ? penaltyAmount
    : +(arrearsBalance * (tariff.penaltyRate / 100)).toFixed(2);

  // Subtotal before discounts/tax
  const subtotal = +(waterSubtotal + sewerageCharge + penalties).toFixed(2);

  // Discounts
  const discounts = +(subtotal * discountPercent).toFixed(2);
  const taxableAmount = +(subtotal - discounts).toFixed(2);

  // VAT
  const vatAmount = +(taxableAmount * vatRate).toFixed(2);
  const totalAmount = +(taxableAmount + vatAmount).toFixed(2);

  return {
    ibtBreakdown,
    consumptionCharge,
    standingCharge,
    waterSubtotal,
    sewerageCharge,
    penalties,
    subtotal,
    discounts,
    taxableAmount,
    vatAmount,
    totalAmount,
  };
}

// ─── Build BillItems array from calculation result ────────────────────────────

export function buildBillItems(
  billId: string,
  result: BillCalcResult,
  tariffName: string,
): BillItem[] {
  const items: BillItem[] = [];
  let idx = 0;

  // IBT water blocks
  for (const block of result.ibtBreakdown) {
    items.push({
      id: `${billId}-w${idx++}`,
      billId,
      description: `Water — ${block.range} @ KES ${block.rate.toFixed(2)}/m³`,
      quantity: block.units,
      rate: block.rate,
      amount: block.amount,
      type: 'water',
    });
  }

  // Standing / fixed charge
  items.push({
    id: `${billId}-sc`,
    billId,
    description: `Standing Charge (${tariffName})`,
    quantity: 1,
    rate: result.standingCharge,
    amount: result.standingCharge,
    type: 'fixed',
  });

  // Sewerage
  if (result.sewerageCharge > 0) {
    items.push({
      id: `${billId}-sw`,
      billId,
      description: 'Sewerage Surcharge',
      quantity: 1,
      rate: result.sewerageCharge,
      amount: result.sewerageCharge,
      type: 'sewerage',
    });
  }

  // Penalty
  if (result.penalties > 0) {
    items.push({
      id: `${billId}-pen`,
      billId,
      description: 'Late Payment Penalty',
      quantity: 1,
      rate: result.penalties,
      amount: result.penalties,
      type: 'penalty',
    });
  }

  // Discount
  if (result.discounts > 0) {
    items.push({
      id: `${billId}-disc`,
      billId,
      description: 'Discount',
      quantity: 1,
      rate: -result.discounts,
      amount: -result.discounts,
      type: 'discount',
    });
  }

  // VAT
  if (result.vatAmount > 0) {
    items.push({
      id: `${billId}-vat`,
      billId,
      description: 'VAT',
      quantity: 1,
      rate: result.vatAmount,
      amount: result.vatAmount,
      type: 'tax',
    });
  }

  return items;
}

// ─── Format billing period label ─────────────────────────────────────────────

export function formatBillingPeriodLabel(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return s.toLocaleString('en-KE', { month: 'long', year: 'numeric' });
  }
  return `${s.toLocaleString('en-KE', { month: 'short', year: 'numeric' })} – ${e.toLocaleString('en-KE', { month: 'short', year: 'numeric' })}`;
}

// ─── Generate bill number ─────────────────────────────────────────────────────

export function generateBillNumber(existingBills: { billNumber: string }[]): string {
  const year = new Date().getFullYear();
  const nums = existingBills
    .map((b) => {
      const m = b.billNumber.match(/INV-(\d{4})-(\d+)/);
      return m ? parseInt(m[2]) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `INV-${year}-${String(next).padStart(3, '0')}`;
}
