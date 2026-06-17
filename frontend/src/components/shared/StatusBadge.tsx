import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, string>;
  labelMap?: Record<string, string>;
  className?: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-red-100 text-red-700',
  BLACKLISTED: 'bg-red-200 text-red-900',
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  RECOMMENDED: 'bg-indigo-100 text-indigo-800',
  APPROVED: 'bg-teal-100 text-teal-800',
  DISBURSED: 'bg-cyan-100 text-cyan-800',
  PAID: 'bg-gray-100 text-gray-700',
  OVERDUE: 'bg-red-100 text-red-800',
  WRITTEN_OFF: 'bg-black/10 text-gray-700',
  REJECTED: 'bg-red-200 text-red-900',
  SENT: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-teal-100 text-teal-800',
  FAILED: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-blue-100 text-blue-800',
};

export default function StatusBadge({ status, colorMap, labelMap, className }: StatusBadgeProps) {
  const colors = { ...DEFAULT_COLORS, ...(colorMap || {}) };
  const label = labelMap?.[status] || status.replace(/_/g, ' ');
  return (
    <span className={cn('badge', colors[status] || 'bg-gray-100 text-gray-600', className)}>
      {label}
    </span>
  );
}