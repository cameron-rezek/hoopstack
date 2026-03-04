'use client';

import { DataTable, type Column } from '@/components/ui/data-table';
import { formatPct, formatPlusMinus, formatStat } from '@/lib/utils';
import type { LineupStats } from '@/lib/types';

interface LineupTableProps {
  data: LineupStats[];
  startRank?: number;
}

export function LineupTable({ data, startRank = 1 }: LineupTableProps) {
  const rankedData = data.map((d, i) => ({ ...d, _rank: startRank + i }));

  const columns: Column<typeof rankedData[0]>[] = [
    { header: '#', accessor: '_rank', className: 'text-[var(--text-secondary)]' },
    {
      header: 'Lineup',
      accessor: 'group_name',
      format: (v) => (
        <span className="text-xs">{v as string}</span>
      ),
    },
    { header: 'Team', accessor: 'team_abbreviation' },
    { header: 'GP', accessor: 'games_played', sortable: true, className: 'font-mono tabular-nums' },
    { header: 'MIN', accessor: 'total_minutes', format: (v) => formatStat(v as number | null, 0), sortable: true, className: 'font-mono tabular-nums' },
    { header: 'Net Rtg', accessor: 'net_rating_per_100', format: (v) => formatStat(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
    { header: 'Off Rtg', accessor: 'offensive_rating', format: (v) => formatStat(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
    { header: '+/-', accessor: 'plus_minus', format: (v) => formatPlusMinus(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
    { header: 'eFG%', accessor: 'effective_fg_pct', format: (v) => formatPct(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
  ];

  return <DataTable columns={columns} data={rankedData} />;
}
