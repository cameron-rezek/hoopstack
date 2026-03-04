import { SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message?: string;
  className?: string;
}

export function EmptyState({ message = 'No results found', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]', className)}>
      <SearchX className="h-10 w-10 mb-3 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
