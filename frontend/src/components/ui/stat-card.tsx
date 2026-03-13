import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
  accent?: boolean;
}

export function StatCard({ label, value, subtitle, className, accent }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all',
      accent && 'border-[color-mix(in_srgb,var(--accent)_20%,var(--border))]',
      className,
    )}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
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
