import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  message?: string;
  className?: string;
}

export function ErrorDisplay({ message = 'Something went wrong', className }: ErrorDisplayProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-[var(--danger)]', className)}>
      <AlertTriangle className="h-10 w-10 mb-3 opacity-70" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
