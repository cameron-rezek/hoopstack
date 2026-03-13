'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => unknown);
  format?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  onRowClick?: (row: T) => void;
}

function getValue<T>(row: T, accessor: Column<T>['accessor']): unknown {
  if (typeof accessor === 'function') return accessor(row);
  return row[accessor];
}

export function DataTable<T>({
  columns,
  data,
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (sortCol === null) return data;
    const col = columns[sortCol];
    return [...data].sort((a, b) => {
      const av = getValue(a, col.accessor);
      const bv = getValue(b, col.accessor);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, columns, sortCol, sortDir]);

  const handleSort = (idx: number) => {
    if (!columns[idx].sortable) return;
    if (sortCol === idx) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(idx);
      setSortDir('desc');
    }
  };

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((col, idx) => (
              <th
                key={idx}
                onClick={() => handleSort(idx)}
                className={cn(
                  'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] whitespace-nowrap',
                  col.sortable && 'cursor-pointer select-none hover:text-[var(--text-secondary)] transition-colors',
                  col.className,
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortCol === idx && (
                    sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-[var(--accent)]" /> : <ChevronDown className="h-3 w-3 text-[var(--accent)]" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-[var(--border-subtle)] transition-colors',
                'hover:bg-[var(--bg-elevated)]',
                onRowClick && 'cursor-pointer',
              )}
            >
              {columns.map((col, colIdx) => {
                const val = getValue(row, col.accessor);
                return (
                  <td
                    key={colIdx}
                    className={cn(
                      'px-4 py-2.5 whitespace-nowrap text-[var(--text-primary)]',
                      col.className,
                    )}
                  >
                    {col.format ? col.format(val, row) : (val as React.ReactNode) ?? '\u2014'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
