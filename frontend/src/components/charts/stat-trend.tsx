'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatTrendProps {
  label: string;
  current: number | null;
  seasonAvg: number | null;
  isPct?: boolean;
  className?: string;
}

export function StatTrend({ label, current, seasonAvg, isPct, className }: StatTrendProps) {
  const format = (v: number | null) => {
    if (v === null || v === undefined) return '\u2014';
    if (isPct) return `${(v * 100).toFixed(1)}%`;
    return v.toFixed(1);
  };

  const diff = current !== null && seasonAvg !== null ? current - seasonAvg : null;
  const trending = diff !== null ? (diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat') : 'flat';

  return (
    <div className={cn('rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3', className)}>
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-mono text-lg font-semibold tabular-nums text-[var(--text-primary)]">
          {format(current)}
        </span>
        {trending === 'up' && <TrendingUp className="h-4 w-4 text-[var(--success)]" />}
        {trending === 'down' && <TrendingDown className="h-4 w-4 text-[var(--danger)]" />}
        {trending === 'flat' && <Minus className="h-4 w-4 text-[var(--text-secondary)]" />}
      </div>
      <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
        Season: {format(seasonAvg)}
      </div>
    </div>
  );
}
