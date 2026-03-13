import { SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message?: string;
  className?: string;
}

export function EmptyState({ message = 'No results found', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] py-16', className)}>
      <SearchX className="h-8 w-8 mb-3 text-[var(--text-tertiary)]" />
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}
