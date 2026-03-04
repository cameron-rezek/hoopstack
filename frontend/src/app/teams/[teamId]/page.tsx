'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTeam, useTeamGames, useTeamLineups } from '@/lib/hooks/use-teams';
import { useSeason } from '@/contexts/season-context';
import { teamLogoUrl } from '@/lib/constants';
import { formatDate, formatPct, formatPlusMinus } from '@/lib/utils';
import { DataTable, type Column } from '@/components/ui/data-table';
import { LineupTable } from '@/components/leaderboards/lineup-table';
import { Tabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { ErrorDisplay } from '@/components/ui/error-display';
import { Shield } from 'lucide-react';
import type { TeamGameLog } from '@/lib/types';

const tabs = [
  { key: 'games', label: 'Game Log' },
  { key: 'lineups', label: 'Lineups' },
];

const gameColumns: Column<TeamGameLog>[] = [
  {
    header: 'Date',
    accessor: 'game_date',
    format: (_, row) => (
      <Link href={`/games/${row.game_id}`} className="text-[var(--accent)] hover:underline">
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
  { header: 'PTS', accessor: 'points', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'REB', accessor: 'total_rebounds', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'AST', accessor: 'assists', sortable: true, className: 'font-mono tabular-nums' },
  { header: 'FG%', accessor: 'field_goal_pct', format: (v) => formatPct(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
  { header: '3P%', accessor: 'three_point_pct', format: (v) => formatPct(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
  { header: '+/-', accessor: 'plus_minus', format: (v) => formatPlusMinus(v as number | null), sortable: true, className: 'font-mono tabular-nums' },
];

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = use(params);
  const teamId = parseInt(teamIdStr, 10);
  const [activeTab, setActiveTab] = useState('games');
  const [gamePage, setGamePage] = useState(1);
  const [lineupPage, setLineupPage] = useState(1);
  const { season } = useSeason();

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId);
  const { data: games, isLoading: gamesLoading } = useTeamGames(teamId, { season, page: gamePage, per_page: 25 });
  const { data: lineups, isLoading: lineupsLoading } = useTeamLineups(teamId, { season, page: lineupPage, per_page: 25 });

  const [logoError, setLogoError] = useState(false);

  if (teamError) {
    return <ErrorDisplay message="Failed to load team" />;
  }

  return (
    <div className="space-y-6">
      {teamLoading ? (
        <div className="flex gap-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <Skeleton className="h-20 w-20" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ) : team ? (
        <div className="flex items-center gap-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="relative h-20 w-20 shrink-0">
            {logoError ? (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--bg-elevated)]">
                <Shield className="h-10 w-10 text-[var(--text-secondary)]" />
              </div>
            ) : (
              <Image
                src={teamLogoUrl(team.team_id)}
                alt={team.team_abbreviation}
                width={80}
                height={80}
                unoptimized
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {team.city ? `${team.city} ${team.team_name}` : team.team_name}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {[team.team_abbreviation, team.conference, team.division, team.arena_name].filter(Boolean).join(' \u00B7 ')}
            </p>
          </div>
        </div>
      ) : null}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'games' && (
        <div className="space-y-4">
          {gamesLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : games?.data ? (
            <>
              <DataTable columns={gameColumns} data={games.data} />
              <Pagination page={games.page} totalPages={games.total_pages} onPageChange={setGamePage} />
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'lineups' && (
        <div className="space-y-4">
          {lineupsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : lineups?.data ? (
            <>
              <LineupTable
                data={lineups.data}
                startRank={(lineups.page - 1) * lineups.per_page + 1}
              />
              <Pagination page={lineups.page} totalPages={lineups.total_pages} onPageChange={setLineupPage} />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
