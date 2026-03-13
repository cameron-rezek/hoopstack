'use client';

import { useMemo } from 'react';
import type { ShotChartItem } from '@/lib/types';
import { formatPct } from '@/lib/utils';

interface ShotDistributionTableProps {
  shots: ShotChartItem[];
}

interface ZoneRow {
  zone: string;
  fga: number;
  fgm: number;
  fgPct: number;
  freqPct: number;
  ptsPerShot: number;
}

const ZONE_ORDER = [
  'Restricted Area',
  'In The Paint (Non-RA)',
  'Mid-Range',
  'Above the Break 3',
  'Left Corner 3',
  'Right Corner 3',
];

function getZoneLabel(basic: string | null, area: string | null): string {
  if (!basic) return 'Unknown';
  if (basic === 'Above the Break 3') return 'Above the Break 3';
  if (basic === 'Left Corner 3') return 'Left Corner 3';
  if (basic === 'Right Corner 3') return 'Right Corner 3';
  if (basic === 'Restricted Area') return 'Restricted Area';
  if (basic === 'In The Paint (Non-RA)') return 'In The Paint (Non-RA)';
  if (basic === 'Mid-Range') return 'Mid-Range';
  if (basic === 'Backcourt') return 'Backcourt';
  return basic;
}

export function ShotDistributionTable({ shots }: ShotDistributionTableProps) {
  const { zones, totals } = useMemo(() => {
    if (!shots.length) return { zones: [], totals: null };

    const grouped = new Map<string, ShotChartItem[]>();

    for (const shot of shots) {
      const label = getZoneLabel(shot.shot_zone_basic, shot.shot_zone_area);
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label)!.push(shot);
    }

    const totalShots = shots.length;
    const totalMakes = shots.filter((s) => s.is_made).length;
    const totalPoints = shots.reduce((sum, s) => sum + (s.is_made ? s.shot_value : 0), 0);

    const zoneRows: ZoneRow[] = [];

    grouped.forEach((zoneShots, zone) => {
      const fga = zoneShots.length;
      const fgm = zoneShots.filter((s) => s.is_made).length;
      const pts = zoneShots.reduce((sum, s) => sum + (s.is_made ? s.shot_value : 0), 0);
      zoneRows.push({
        zone,
        fga,
        fgm,
        fgPct: fga > 0 ? fgm / fga : 0,
        freqPct: totalShots > 0 ? fga / totalShots : 0,
        ptsPerShot: fga > 0 ? pts / fga : 0,
      });
    });

    // Sort by predefined order
    zoneRows.sort((a, b) => {
      const ai = ZONE_ORDER.indexOf(a.zone);
      const bi = ZONE_ORDER.indexOf(b.zone);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return {
      zones: zoneRows,
      totals: {
        fga: totalShots,
        fgm: totalMakes,
        fgPct: totalShots > 0 ? totalMakes / totalShots : 0,
        freqPct: 1,
        ptsPerShot: totalShots > 0 ? totalPoints / totalShots : 0,
      },
    };
  }, [shots]);

  if (!zones.length || !totals) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Shot Distribution
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="px-4 py-2.5 text-left">Zone</th>
              <th className="px-3 py-2.5 text-right">FGM</th>
              <th className="px-3 py-2.5 text-right">FGA</th>
              <th className="px-3 py-2.5 text-right">FG%</th>
              <th className="px-3 py-2.5 text-right">Freq%</th>
              <th className="px-3 py-2.5 text-right">PTS/Shot</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((row) => (
              <tr key={row.zone} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-elevated)] transition-colors">
                <td className="px-4 py-2 text-[var(--text-primary)] font-medium text-xs">{row.zone}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">{row.fgm}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">{row.fga}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-primary)]">
                  <span className={row.fgPct >= totals.fgPct ? 'text-green-400' : 'text-red-400'}>
                    {formatPct(row.fgPct)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {formatPct(row.freqPct)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--text-primary)]">
                  {row.ptsPerShot.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--border)] bg-[var(--bg-elevated)]">
              <td className="px-4 py-2 text-[var(--text-primary)] font-semibold text-xs">Total</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">{totals.fgm}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">{totals.fga}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">{formatPct(totals.fgPct)}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">100.0%</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">{totals.ptsPerShot.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
