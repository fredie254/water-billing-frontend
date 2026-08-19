import { cn } from '@/shared/utils/utils';

export const Spinner = ({ className }: { className?: string }) => (
  <div className={cn('inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin', className)} />
);

export const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-64">
    <Spinner />
  </div>
);
