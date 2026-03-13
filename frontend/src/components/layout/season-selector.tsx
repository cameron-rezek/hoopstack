'use client';

import { Calendar } from 'lucide-react';
import { useSeason } from '@/contexts/season-context';

export function SeasonSelector() {
  const { season, setSeason, seasons, loading } = useSeason();

  if (loading) {
    return (
      <div className="h-9 w-32 animate-pulse rounded-lg bg-[var(--bg-elevated)]" />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
      <select
        value={season}
        onChange={(e) => setSeason(e.target.value)}
        className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 pr-7 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
