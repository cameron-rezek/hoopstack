'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { formatPct, formatPlusMinus, formatStat } from '@/lib/utils';
import type { PlayerGameAdvanced } from '@/lib/types';

interface BoxScoreTableProps {
  players: PlayerGameAdvanced[];
  homeTeamId: number;
}

function TeamSection({ players, teamName }: { players: PlayerGameAdvanced[]; teamName: string }) {
  const sorted = useMemo(
    () => [...players].sort((a, b) => (b.minutes_played ?? 0) - (a.minutes_played ?? 0)),
    [players],
  );

  return (
    <div className="overflow-x-auto">
      <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">{teamName}</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
            <th className="px-2 py-1.5 text-left">Player</th>
            <th className="px-2 py-1.5 text-right">MIN</th>
            <th className="px-2 py-1.5 text-right">PTS</th>
            <th className="px-2 py-1.5 text-right">REB</th>
            <th className="px-2 py-1.5 text-right">AST</th>
            <th className="px-2 py-1.5 text-right">STL</th>
            <th className="px-2 py-1.5 text-right">BLK</th>
            <th className="px-2 py-1.5 text-right">TO</th>
            <th className="px-2 py-1.5 text-right">FG</th>
            <th className="px-2 py-1.5 text-right">3P</th>
            <th className="px-2 py-1.5 text-right">FT</th>
            <th className="px-2 py-1.5 text-right">+/-</th>
            <th className="px-2 py-1.5 text-right">TS%</th>
            <th className="px-2 py-1.5 text-right">GmSc</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.player_id} className="border-b border-[var(--border)]/30 even:bg-[var(--bg-elevated)]/30">
              <td className="px-2 py-1.5">
                <Link href={`/players/${p.player_id}`} className="text-[var(--accent)] hover:underline">
                  {p.player_name}
                </Link>
              </td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatStat(p.minutes_played, 0)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums font-medium">{p.points}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{p.total_rebounds}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{p.assists}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{p.steals}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{p.blocks}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{p.turnovers}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{p.field_goals_made}-{p.field_goals_attempted}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{p.three_pointers_made}-{p.three_pointers_attempted}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{p.free_throws_made}-{p.free_throws_attempted}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatPlusMinus(p.plus_minus)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatPct(p.true_shooting_pct)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatStat(p.game_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BoxScoreTable({ players, homeTeamId }: BoxScoreTableProps) {
  const home = players.filter((p) => p.team_id === homeTeamId);
  const away = players.filter((p) => p.team_id !== homeTeamId);
  const homeName = home[0]?.team_name ?? 'Home';
  const awayName = away[0]?.team_name ?? 'Away';

  return (
    <div className="space-y-6">
      <TeamSection players={away} teamName={awayName} />
      <TeamSection players={home} teamName={homeName} />
    </div>
  );
}
