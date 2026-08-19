import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrency = (amount: number, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat('en-KE').format(n);

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const truncate = (str: string, maxLen = 40) =>
  str.length > maxLen ? str.slice(0, maxLen) + '…' : str;

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const statusColor = (status: string): string => {
  const map: Record<string, string> = {
    active: 'badge-green',
    paid: 'badge-green',
    completed: 'badge-green',
    sent: 'badge-green',
    online: 'badge-green',
    issued: 'badge-blue',
    pending: 'badge-yellow',
    partial: 'badge-yellow',
    suspended: 'badge-yellow',
    faulty: 'badge-yellow',
    overdue: 'badge-red',
    disconnected: 'badge-red',
    failed: 'badge-red',
    inactive: 'badge-gray',
    cancelled: 'badge-gray',
    void: 'badge-gray',
    draft: 'badge-gray',
    manual: 'badge-purple',
    iot: 'badge-blue',
    estimate: 'badge-yellow',
    smart_iot: 'badge-blue',
    mechanical: 'badge-gray',
    digital: 'badge-purple',
  };
  return map[status] ?? 'badge-gray';
};
