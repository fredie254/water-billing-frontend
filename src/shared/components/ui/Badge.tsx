import { cn, statusColor } from '@/shared/utils/utils';

interface BadgeProps {
  label: string;
  variant?: string;
  className?: string;
}

export const Badge = ({ label, variant, className }: BadgeProps) => {
  const cls = variant ?? statusColor(label.toLowerCase());
  return (
    <span className={cn(cls, className)}>
      {label.replace(/_/g, ' ')}
    </span>
  );
};
