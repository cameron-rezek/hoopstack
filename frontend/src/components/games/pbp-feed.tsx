'use client';

import { useState, useMemo } from 'react';
import { parsePbpClock, cn } from '@/lib/utils';
import type { PlayByPlayEvent } from '@/lib/types';

interface PbpFeedProps {
  events: PlayByPlayEvent[];
}

export function PbpFeed({ events }: PbpFeedProps) {
  const periods = useMemo(() => {
    const set = new Set(events.map((e) => e.period));
    return Array.from(set).sort((a, b) => a - b);
  }, [events]);

  const [activePeriod, setActivePeriod] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (activePeriod === null) return events;
    return events.filter((e) => e.period === activePeriod);
  }, [events, activePeriod]);

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex gap-1">
        <button
          onClick={() => setActivePeriod(null)}
          className={cn(
            'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
            activePeriod === null
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]',
          )}
        >
          All
        </button>
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={cn(
              'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
              activePeriod === p
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]',
            )}
          >
            {p <= 4 ? `Q${p}` : `OT${p - 4}`}
          </button>
        ))}
      </div>

      {/* Events */}
      <div className="max-h-[600px] overflow-y-auto space-y-0.5">
        {filtered.map((event, i) => {
          const prevPeriod = i > 0 ? filtered[i - 1].period : null;
          const showPeriodHeader = event.period !== prevPeriod;

          return (
            <div key={`${event.game_id}-${event.action_number}`}>
              {showPeriodHeader && (
                <div className="sticky top-0 bg-[var(--bg-primary)] py-2 text-xs font-semibold text-[var(--accent)]">
                  {event.period <= 4 ? `Quarter ${event.period}` : `Overtime ${event.period - 4}`}
                </div>
              )}
              <div className="flex items-start gap-3 rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--bg-elevated)]/50">
                <span className="w-10 shrink-0 font-mono tabular-nums text-[var(--text-secondary)]">
                  {parsePbpClock(event.clock)}
                </span>
                <span className={cn(
                  'w-8 shrink-0 font-semibold',
                  event.team_tricode ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                )}>
                  {event.team_tricode ?? ''}
                </span>
                <span className="flex-1 text-[var(--text-primary)]">
                  {event.description}
                </span>
                {event.score_home && event.score_away && (
                  <span className="shrink-0 font-mono tabular-nums text-[var(--text-secondary)]">
                    {event.score_away}-{event.score_home}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
