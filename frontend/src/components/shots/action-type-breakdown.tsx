'use client';

import { useMemo, useState } from 'react';
import type { ShotChartItem } from '@/lib/types';
import { formatPct } from '@/lib/utils';

interface ActionTypeBreakdownProps {
  shots: ShotChartItem[];
}

interface ActionRow {
  actionType: string;
  fga: number;
  fgm: number;
  fgPct: number;
  freqPct: number;
  ptsPerShot: number;
}

export function ActionTypeBreakdown({ shots }: ActionTypeBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    if (!shots.length) return [];

    const grouped = new Map<string, ShotChartItem[]>();
    for (const shot of shots) {
      const key = shot.action_type || 'Unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(shot);
    }

    const totalShots = shots.length;
    const actionRows: ActionRow[] = [];

    grouped.forEach((actionShots, actionType) => {
      const fga = actionShots.length;
      const fgm = actionShots.filter((s) => s.is_made).length;
      const pts = actionShots.reduce((sum, s) => sum + (s.is_made ? s.shot_value : 0), 0);
      actionRows.push({
        actionType,
        fga,
        fgm,
        fgPct: fga > 0 ? fgm / fga : 0,
        freqPct: totalShots > 0 ? fga / totalShots : 0,
        ptsPerShot: fga > 0 ? pts / fga : 0,
      });
    });

    actionRows.sort((a, b) => b.fga - a.fga);
    return actionRows;
  }, [shots]);

  if (!rows.length) return null;

  const displayRows = expanded ? rows : rows.slice(0, 8);
  const overallFgPct = shots.length > 0
    ? shots.filter((s) => s.is_made).length / shots.length
    : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Shot Type Breakdown
        </h3>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {rows.length} types
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-4 py-2.5 text-left">Shot Type</th>
              <th className="px-3 py-2.5 text-right">FGA</th>
              <th className="px-3 py-2.5 text-right">FG%</th>
              <th className="px-3 py-2.5 text-right">Freq%</th>
              <th className="px-3 py-2.5 text-right w-[140px]">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.actionType} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-elevated)] transition-colors">
                <td className="px-4 py-2 text-[var(--text-primary)] font-medium text-xs">{row.actionType}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">{row.fga}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  <span className={row.fgPct >= overallFgPct ? 'text-green-400' : 'text-red-400'}>
                    {formatPct(row.fgPct)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {formatPct(row.freqPct)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.min(row.freqPct * 100, 100)}%`, opacity: 0.8 + row.freqPct * 2 }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          {expanded ? 'Show Less' : `Show All ${rows.length} Types`}
        </button>
      )}
    </div>
  );
}
