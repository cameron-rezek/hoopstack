'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchShotQualityLeaderboard, fetchLineupLeaderboard } from '@/lib/api';
import { useSeason } from '@/contexts/season-context';
import { ShotQualityTable } from '@/components/leaderboards/shot-quality-table';
import { LineupTable } from '@/components/leaderboards/lineup-table';
import { Tabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/loading-skeleton';

const tabs = [
  { key: 'shot-quality', label: 'Shot Quality' },
  { key: 'lineups', label: 'Lineups' },
];

export default function LeaderboardsPage() {
  const { season } = useSeason();
  const [activeTab, setActiveTab] = useState('shot-quality');
  const [sqPage, setSqPage] = useState(1);
  const [luPage, setLuPage] = useState(1);
  const [minShots, setMinShots] = useState(100);
  const [minMinutes, setMinMinutes] = useState(50);

  const { data: sqData, isLoading: sqLoading } = useQuery({
    queryKey: ['shotQualityLeaderboard', season, sqPage, minShots],
    queryFn: () =>
      fetchShotQualityLeaderboard({
        season,
        page: sqPage,
        per_page: 25,
        min_shots: minShots,
        sort_by: 'pax_per_100_shots',
      }),
  });

  const { data: luData, isLoading: luLoading } = useQuery({
    queryKey: ['lineupLeaderboard', season, luPage, minMinutes],
    queryFn: () =>
      fetchLineupLeaderboard({
        season,
        page: luPage,
        per_page: 25,
        min_minutes: minMinutes,
        sort_by: 'net_rating_per_100',
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Leaderboards</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Top performers for {season}
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'shot-quality' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-[var(--text-secondary)]">
              Min shots:
              <input
                type="number"
                value={minShots}
                onChange={(e) => { setMinShots(Number(e.target.value)); setSqPage(1); }}
                className="ml-2 h-8 w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 text-sm text-[var(--text-primary)] outline-none"
              />
            </label>
          </div>

          {sqLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : sqData ? (
            <>
              <ShotQualityTable
                data={sqData.data}
                startRank={(sqData.page - 1) * sqData.per_page + 1}
              />
              <Pagination page={sqData.page} totalPages={sqData.total_pages} onPageChange={setSqPage} />
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'lineups' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs text-[var(--text-secondary)]">
              Min minutes:
              <input
                type="number"
                value={minMinutes}
                onChange={(e) => { setMinMinutes(Number(e.target.value)); setLuPage(1); }}
                className="ml-2 h-8 w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 text-sm text-[var(--text-primary)] outline-none"
              />
            </label>
          </div>

          {luLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : luData ? (
            <>
              <LineupTable
                data={luData.data}
                startRank={(luData.page - 1) * luData.per_page + 1}
              />
              <Pagination page={luData.page} totalPages={luData.total_pages} onPageChange={setLuPage} />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
