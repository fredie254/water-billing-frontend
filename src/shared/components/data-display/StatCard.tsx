import { cn } from '@/shared/utils/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
}

const colorMap = {
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', trend: 'text-blue-600' },
  green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', trend: 'text-green-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', trend: 'text-yellow-600' },
  red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', trend: 'text-red-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', trend: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', trend: 'text-indigo-600' },
};

export const StatCard = ({ title, value, subtitle, icon, trend, color = 'blue' }: StatCardProps) => {
  const c = colorMap[color];
  return (
    <div className="card p-6 flex items-start gap-4">
      <div className={cn('p-3 rounded-xl flex-shrink-0', c.icon)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs font-medium mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
};
