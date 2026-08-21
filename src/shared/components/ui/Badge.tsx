import { cn, statusColor } from '@/shared/utils/utils';

interface BadgeProps {
  label: string | null | undefined;
  variant?: string;
  className?: string;
}

export const Badge = ({ label, variant, className }: BadgeProps) => {
  if (label == null) return <span className={cn('badge-gray', className)}>—</span>;
  const cls = variant ?? statusColor(label.toLowerCase());
  return (
    <span className={cn(cls, className)}>
      {label.replace(/_/g, ' ')}
    </span>
  );
};
