import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
  accent?: boolean;
  percentile?: number | null;
}

function percentileColor(p: number): string {
  if (p >= 90) return 'text-green-400 bg-green-400/10 border-green-400/20';
  if (p >= 75) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (p >= 50) return 'text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--border)]';
  if (p >= 25) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
  return 'text-red-400 bg-red-400/10 border-red-400/20';
}

export function StatCard({ label, value, subtitle, className, accent, percentile }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all',
      accent && 'border-[color-mix(in_srgb,var(--accent)_20%,var(--border))]',
      className,
    )}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
        {percentile != null && (
          <span className={cn(
            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold tabular-nums tracking-wide',
            percentileColor(percentile),
          )}>
            {Math.round(percentile)}th
          </span>
        )}
      </div>
      <div className={cn(
        'mt-1 font-mono text-2xl font-bold tabular-nums',
        accent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]',
      )}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</div>
      )}
    </div>
  );
}
