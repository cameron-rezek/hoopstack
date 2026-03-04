'use client';

import { useSeason } from '@/contexts/season-context';

export function SeasonSelector() {
  const { season, setSeason, seasons, loading } = useSeason();

  if (loading) {
    return (
      <div className="h-9 w-32 animate-pulse rounded-lg bg-[var(--bg-elevated)]" />
    );
  }

  return (
    <select
      value={season}
      onChange={(e) => setSeason(e.target.value)}
      className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
    >
      {seasons.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
