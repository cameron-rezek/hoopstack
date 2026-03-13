'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-[var(--bg-card)]"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[60px] text-center text-xs font-medium text-[var(--text-secondary)]">
        <span className="text-[var(--text-primary)]">{page}</span> / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-[var(--bg-card)]"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {total !== undefined && (
        <span className="text-xs text-[var(--text-tertiary)]">
          {total.toLocaleString()} total
        </span>
      )}
    </div>
  );
}
