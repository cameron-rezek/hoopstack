import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  message?: string;
  className?: string;
}

export function ErrorDisplay({ message = 'Something went wrong', className }: ErrorDisplayProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-[var(--danger-muted)] bg-[var(--danger-muted)] py-16', className)}>
      <AlertTriangle className="h-8 w-8 mb-3 text-[var(--danger)]" />
      <p className="text-sm font-medium text-[var(--danger)]">{message}</p>
    </div>
  );
}
