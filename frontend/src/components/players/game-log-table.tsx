'use client';

import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatDate, formatPct, formatPlusMinus, formatStat } from '@/lib/utils';
import type { PlayerGameAdvanced } from '@/lib/types';

const columns: Column<PlayerGameAdvanced>[] = [
  {
    header: 'Date',
    accessor: 'game_date',
    format: (_, row) => (
      <Link
        href={`/games/${row.game_id}`}
        className="text-[var(--accent)] hover:underline"
      >
        {formatDate(row.game_date)}
      </Link>
    ),
    sortable: true,
  },
  { header: 'Matchup', accessor: 'matchup' },
  {
    header: 'W/L',
    accessor: 'win_loss',
    format: (v) => (
      <span className={v === 'W' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
        {v as string}
      </span>
    ),
  },
  { header: 'MIN', accessor: 'minutes_played', format: (v) => formatStat(v as number | null, 0), sortable: true, className: 'font-mono tabular-nums' },
  { header: 'PTS', accessor: 'points', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'REB', accessor: 'total_rebounds', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'AST', accessor: 'assists', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'STL', accessor: 'steals', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'BLK', accessor: 'blocks', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'TO', accessor: 'turnovers', sortable: true, className: 'font-mono tabular-nums' },
  {
    header: 'FG%',
    accessor: 'field_goal_pct',
    format: (v) => formatPct(v as number | null),
    sortable: true,
    className: 'font-mono tabular-nums',
  },
  {
    header: '3P%',
    accessor: 'three_point_pct',
    format: (v) => formatPct(v as number | null),
    sortable: true,
    className: 'font-mono tabular-nums',
  },
  {
    header: 'FT%',
    accessor: 'free_throw_pct',
    format: (v) => formatPct(v as number | null),
    sortable: true,
    className: 'font-mono tabular-nums',
  },
  {
    header: '+/-',
    accessor: 'plus_minus',
    format: (v) => formatPlusMinus(v as number | null),
    sortable: true,
    className: 'font-mono tabular-nums',
  },
  {
    header: 'TS%',
    accessor: 'true_shooting_pct',
    format: (v) => formatPct(v as number | null),
    sortable: true,
    className: 'font-mono tabular-nums',
  },
  {
    header: 'GmSc',
    accessor: 'game_score',
    format: (v) => formatStat(v as number | null),
    sortable: true,
    className: 'font-mono tabular-nums',
  },
];

interface GameLogTableProps {
  data: PlayerGameAdvanced[];
}

export function GameLogTable({ data }: GameLogTableProps) {
  return <DataTable columns={columns} data={data} />;
}
