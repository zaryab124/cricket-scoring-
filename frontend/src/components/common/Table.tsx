import React, { ReactNode } from 'react';
import { Skeleton } from '../feedback/Skeleton.js';
import { EmptyState } from '../feedback/EmptyState.js';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data to display for this view.',
  emptyAction,
  onRowClick,
  className = '',
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-12">
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`overflow-x-auto w-full ${className}`}>
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase bg-pitch-950/60 text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-5 py-3.5 ${alignmentClass[col.align || 'left']} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {data.map((item, index) => (
            <tr
              key={keyExtractor(item, index)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-slate-800/40' : 'hover:bg-slate-800/20'
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-4 whitespace-nowrap ${alignmentClass[col.align || 'left']} ${
                    col.className || ''
                  }`}
                >
                  {col.render ? col.render(item, index) : ((item as any)[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
