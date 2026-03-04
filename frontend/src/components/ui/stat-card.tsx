import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export function StatCard({ label, value, subtitle, className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4', className)}>
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</div>
      )}
    </div>
  );
}
