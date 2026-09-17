import { ReactNode, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

export type SortDirection = 'asc' | 'desc' | null;

export interface TableColumn<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  cellClassName?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  emptyState?: ReactNode;
  loading?: boolean;
  sortBy?: keyof T | string;
  sortDirection?: SortDirection;
  onSort?: (key: keyof T | string) => void;
  rowKey?: keyof T | ((row: T) => string | number);
  striped?: boolean;
  hoverable?: boolean;
  dense?: boolean;
  className?: string;
}

const Table = <T,>({
  columns,
  data,
  emptyMessage = 'No data found.',
  emptyState,
  loading = false,
  sortBy,
  sortDirection,
  onSort,
  rowKey,
  striped = true,
  hoverable = true,
  dense = false,
  className = '',
}: TableProps<T>) => {
  const [internalSortBy, setInternalSortBy] = useState<keyof T | string>('');
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(null);

  const effectiveSortBy = sortBy ?? internalSortBy;
  const effectiveSortDirection = sortDirection ?? internalSortDirection;

  const handleSort = (key: keyof T | string) => {
    if (onSort) {
      onSort(key);
      return;
    }

    setInternalSortBy(key);
    setInternalSortDirection((prev) => {
      if (prev === 'asc') return 'desc';
      if (prev === 'desc') return null;
      return 'asc';
    });
  };

  const sortedData = useMemo(() => {
    if (!effectiveSortBy || !effectiveSortDirection) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = a[effectiveSortBy as keyof T];
      const bVal = b[effectiveSortBy as keyof T];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison =
        typeof aVal === 'string' && typeof bVal === 'string'
          ? aVal.localeCompare(bVal)
          : aVal < bVal
          ? -1
          : aVal > bVal
          ? 1
          : 0;

      return effectiveSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, effectiveSortBy, effectiveSortDirection]);

  const getRowKey = (row: T, index: number): string => {
    if (rowKey) {
      if (typeof rowKey === 'function') {
        return String(rowKey(row));
      }
      return String(row[rowKey]);
    }
    return String(index);
  };

  const defaultEmptyState = <EmptyState title="" description={emptyMessage} />;

  if (loading) {
    return <LoadingState skeleton columns={columns.length} skeletonRows={5} />;
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full" role="grid">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-left text-sm font-semibold text-slate-700 ${
                    column.headerClassName || ''
                  } ${column.sortable ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
                  scope="col"
                  onClick={() => column.sortable && handleSort(column.accessor || column.header)}
                  aria-sort={
                    effectiveSortBy === (column.accessor || column.header)
                      ? effectiveSortDirection === 'asc'
                        ? 'ascending'
                        : effectiveSortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                      : 'none'
                  }
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && (
                      <span className="flex-shrink-0">
                        {effectiveSortBy === (column.accessor || column.header) ? (
                          effectiveSortDirection === 'asc' ? (
                            <ChevronUp size={14} className="text-blue-600" aria-hidden="true" />
                          ) : effectiveSortDirection === 'desc' ? (
                            <ChevronDown size={14} className="text-blue-600" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown size={14} className="text-slate-400" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown size={14} className="text-slate-300" aria-hidden="true" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8">
                  {emptyState || defaultEmptyState}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={`transition-colors ${
                    striped && rowIndex % 2 === 1 ? 'bg-slate-50' : ''
                  } ${hoverable ? 'hover:bg-slate-50' : ''}`}
                >
                  {columns.map((column, columnIndex) => (
                    <td
                      key={columnIndex}
                      className={`px-6 py-4 text-sm text-slate-700 ${
                        column.cellClassName || ''
                        } ${dense ? 'py-2' : ''}`}
                    >
                      {column.render
                        ? column.render(row)
                        : column.accessor
                        ? String(row[column.accessor] ?? '—')
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;