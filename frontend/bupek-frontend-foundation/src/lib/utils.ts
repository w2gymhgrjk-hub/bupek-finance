import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'TZS'): string {
  const n = Number(amount || 0);
  return `${currency} ${n.toLocaleString('en-TZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return isValid(d) ? format(d, fmt) : '—';
  } catch { return '—'; }
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  return formatDate(dateStr, 'dd MMM yyyy, HH:mm');
}

export function getLoanStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800',
    RECOMMENDED: 'bg-indigo-100 text-indigo-800',
    APPROVED: 'bg-teal-100 text-teal-800',
    DISBURSED: 'bg-cyan-100 text-cyan-800',
    ACTIVE: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    PAID: 'bg-gray-100 text-gray-800',
    WRITTEN_OFF: 'bg-black/10 text-gray-700',
    REJECTED: 'bg-red-200 text-red-900',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

export function getScheduleStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700',
    PARTIAL: 'bg-blue-50 text-blue-700',
    PAID: 'bg-green-50 text-green-700',
    OVERDUE: 'bg-red-50 text-red-700',
  };
  return map[status] || 'bg-gray-50 text-gray-600';
}

export function getActivityOutcomeColor(outcome: string): string {
  const map: Record<string, string> = {
    PAID: 'text-green-600',
    PROMISED: 'text-blue-600',
    REFUSED: 'text-red-600',
    UNREACHABLE: 'text-yellow-600',
    OTHER: 'text-gray-500',
  };
  return map[outcome] || 'text-gray-500';
}

export function buildQueryString(params: Record<string, unknown>): string {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null);
  return new URLSearchParams(clean.map(([k, v]) => [k, String(v)])).toString();
}