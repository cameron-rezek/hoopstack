'use client';

import type { ShotChartItem } from '@/lib/types';

interface ShotTooltipProps {
  shot: ShotChartItem | null;
  x: number;
  y: number;
}

export function ShotTooltip({ shot, x, y }: ShotTooltipProps) {
  if (!shot) return null;

  return (
    <g>
      <foreignObject x={x + 10} y={y - 60} width={180} height={80}>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-xs shadow-lg">
          <div className="font-medium text-[var(--text-primary)]">
            {shot.action_type}
          </div>
          <div className="text-[var(--text-secondary)]">
            {shot.shot_distance ? `${shot.shot_distance} ft` : ''}{' \u00B7 '}
            <span className={shot.is_made ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
              {shot.is_made ? 'Made' : 'Missed'}
            </span>
          </div>
          <div className="text-[var(--text-secondary)]">
            Q{shot.period} {shot.minutes_remaining}:{String(shot.seconds_remaining).padStart(2, '0')}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
