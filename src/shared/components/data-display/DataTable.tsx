import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/shared/utils/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export const DataTable = <T,>({
  data, columns, loading, emptyMessage = 'No records found', pagination,
  onSearch, searchPlaceholder = 'Search…', actions, rowKey, onRowClick,
}: DataTableProps<T>) => {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  return (
    <div className="card">
      {(onSearch || actions) && (
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {onSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                onChange={(e) => onSearch(e.target.value)}
                className="input-base pl-9 w-64"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-gray-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    idx % 2 === 0 ? 'bg-white' : 'bg-blue-50',
                    'hover:bg-blue-100 transition-colors duration-100',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  p === pagination.page ? 'bg-primary-600 text-white' : 'hover:bg-gray-100'
                )}
                onClick={() => pagination.onPageChange(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
