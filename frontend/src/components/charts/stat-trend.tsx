'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatTrendProps {
  label: string;
  current: number | null;
  seasonAvg: number | null;
  isPct?: boolean;
  isPctRaw?: boolean;
  className?: string;
}

export function StatTrend({ label, current, seasonAvg, isPct, isPctRaw, className }: StatTrendProps) {
  const format = (v: number | null) => {
    if (v === null || v === undefined) return '\u2014';
    if (isPct) return `${(v * 100).toFixed(1)}%`;
    if (isPctRaw) return `${v.toFixed(1)}%`;
    return v.toFixed(1);
  };

  const diff = current !== null && seasonAvg !== null ? current - seasonAvg : null;
  const trending = diff !== null ? (diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat') : 'flat';

  return (
    <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3.5', className)}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="font-mono text-lg font-bold tabular-nums text-[var(--text-primary)]">
          {format(current)}
        </span>
        <div className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full',
          trending === 'up' && 'bg-[var(--success-muted)]',
          trending === 'down' && 'bg-[var(--danger-muted)]',
          trending === 'flat' && 'bg-[var(--bg-elevated)]',
        )}>
          {trending === 'up' && <TrendingUp className="h-3 w-3 text-[var(--success)]" />}
          {trending === 'down' && <TrendingDown className="h-3 w-3 text-[var(--danger)]" />}
          {trending === 'flat' && <Minus className="h-3 w-3 text-[var(--text-tertiary)]" />}
        </div>
      </div>
      <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
        Season avg: {format(seasonAvg)}
      </div>
    </div>
  );
}
