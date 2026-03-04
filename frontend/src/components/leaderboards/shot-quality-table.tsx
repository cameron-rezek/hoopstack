'use client';

import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatPct, formatStat } from '@/lib/utils';
import type { ShotQuality } from '@/lib/types';

const columns: Column<ShotQuality>[] = [
  {
    header: '#',
    accessor: (_, ) => null,
    format: (_, __, ) => null,
  },
  {
    header: 'Player',
    accessor: 'player_name',
    format: (_, row) => (
      <Link href={`/players/${row.player_id}`} className="text-[var(--accent)] hover:underline">
        {row.player_name}
      </Link>
    ),
  },
  { header: 'Team', accessor: 'team_name' },
  { header: 'Shots', accessor: 'total_shots', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'FG%', accessor: 'fg_pct', format: (v) => formatPct(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
  { header: 'PAX/100', accessor: 'pax_per_100_shots', format: (v) => formatStat(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
  { header: 'Shot Quality', accessor: 'shot_quality_score', format: (v) => formatStat(v as number | null, 2), sortable: true, className: 'font-mono tabular-nums' },
  { header: 'Shot Making', accessor: 'shot_making_score', format: (v) => formatStat(v as number | null, 2), sortable: true, className: 'font-mono tabular-nums' },
];

interface ShotQualityTableProps {
  data: ShotQuality[];
  startRank?: number;
}

export function ShotQualityTable({ data, startRank = 1 }: ShotQualityTableProps) {
  // Override rank column
  const cols = columns.map((col, idx) => {
    if (idx === 0) {
      return {
        ...col,
        format: (_: unknown, __: ShotQuality, rowIdx?: number) => (
          <span className="text-[var(--text-secondary)]">{startRank + (rowIdx ?? 0)}</span>
        ),
        accessor: (_: ShotQuality, rowIdx?: number) => startRank + (rowIdx ?? 0),
      } as Column<ShotQuality>;
    }
    return col;
  });

  // Simpler approach: use index-based rank
  const rankedData = data.map((d, i) => ({ ...d, _rank: startRank + i }));
  const rankedCols: Column<typeof rankedData[0]>[] = [
    { header: '#', accessor: '_rank', className: 'text-[var(--text-secondary)]' },
    ...columns.slice(1) as Column<typeof rankedData[0]>[],
  ];

  return <DataTable columns={rankedCols} data={rankedData} />;
}
