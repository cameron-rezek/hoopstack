'use client';

import { use, useState, useMemo } from 'react';
import { usePlayer, usePlayerGames } from '@/lib/hooks/use-players';
import { useAllPlayerShots } from '@/lib/hooks/use-shots';
import { usePlayerRolling, usePlayerShotQuality } from '@/lib/hooks/use-stats';
import { useSeason } from '@/contexts/season-context';
import { PlayerHeader } from '@/components/players/player-header';
import { GameLogTable } from '@/components/players/game-log-table';
import { Court } from '@/components/shots/court';
import { ShotScatter } from '@/components/shots/shot-scatter';
import { ShotHexbin } from '@/components/shots/shot-hexbin';
import { ShotZones } from '@/components/shots/shot-zones';
import { ShotChartControls, type ShotView, type ShotFilter } from '@/components/shots/shot-chart-controls';
import { RollingLineChart, statConfig, type RollingStat } from '@/components/charts/rolling-line-chart';
import { StatTrend } from '@/components/charts/stat-trend';
import { Tabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { ErrorDisplay } from '@/components/ui/error-display';
import { formatPct, formatStat } from '@/lib/utils';

const tabs = [
  { key: 'gamelog', label: 'Game Log' },
  { key: 'shots', label: 'Shot Chart' },
  { key: 'rolling', label: 'Rolling Stats' },
];

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId: playerIdStr } = use(params);
  const playerId = parseInt(playerIdStr, 10);
  const [activeTab, setActiveTab] = useState('gamelog');
  const [page, setPage] = useState(1);
  const [shotView, setShotView] = useState<ShotView>('scatter');
  const [shotFilter, setShotFilter] = useState<ShotFilter>('all');
  const [rollingStat, setRollingStat] = useState<RollingStat>('points');
  const { season } = useSeason();

  const { data: player, isLoading: playerLoading, error: playerError } = usePlayer(playerId);
  const { data: games, isLoading: gamesLoading } = usePlayerGames(playerId, {
    season,
    page,
    per_page: 25,
  });
  const { data: allShots, isLoading: shotsLoading } = useAllPlayerShots(playerId, { season });
  const { data: rollingData, isLoading: rollingLoading } = usePlayerRolling(playerId, { season });
  const { data: shotQuality } = usePlayerShotQuality(playerId, { season });

  const filteredShots = useMemo(() => {
    if (!allShots) return [];
    if (shotFilter === '2pt') return allShots.filter((s) => s.shot_value === 2);
    if (shotFilter === '3pt') return allShots.filter((s) => s.shot_value === 3);
    return allShots;
  }, [allShots, shotFilter]);

  const shotStats = useMemo(() => {
    if (!filteredShots.length) return null;
    const total = filteredShots.length;
    const makes = filteredShots.filter((s) => s.is_made).length;
    const threes = filteredShots.filter((s) => s.shot_value === 3);
    const threesMade = threes.filter((s) => s.is_made).length;
    const points = filteredShots.reduce((sum, s) => sum + (s.is_made ? s.shot_value : 0), 0);
    return {
      total,
      fgPct: makes / total,
      threePct: threes.length > 0 ? threesMade / threes.length : null,
      points,
    };
  }, [filteredShots]);

  if (playerError) {
    return <ErrorDisplay message="Failed to load player" />;
  }

  return (
    <div className="space-y-6">
      {playerLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex gap-6">
            <Skeleton className="h-28 w-28 rounded-xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </div>
      ) : player ? (
        <PlayerHeader player={player} />
      ) : null}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'gamelog' && (
        <div className="space-y-4">
          {gamesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : games?.data ? (
            <>
              <GameLogTable data={games.data} />
              <Pagination
                page={games.page}
                totalPages={games.total_pages}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'shots' && (
        <div className="space-y-6">
          <ShotChartControls
            view={shotView}
            onViewChange={setShotView}
            filter={shotFilter}
            onFilterChange={setShotFilter}
          />

          {shotsLoading ? (
            <Skeleton className="mx-auto h-[470px] max-w-[500px]" />
          ) : (
            <div className="mx-auto max-w-[600px]">
              <Court>
                {shotView === 'scatter' && <ShotScatter shots={filteredShots} />}
                {shotView === 'hexbin' && <ShotHexbin shots={filteredShots} />}
                {shotView === 'zones' && <ShotZones shots={filteredShots} />}
              </Court>

              {shotStats && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Total Shots" value={shotStats.total} />
                  <StatCard label="FG%" value={formatPct(shotStats.fgPct)} />
                  <StatCard label="3P%" value={shotStats.threePct !== null ? formatPct(shotStats.threePct) : '\u2014'} />
                  <StatCard label="Points" value={shotStats.points} accent />
                </div>
              )}
            </div>
          )}

          {allShots && (
            <p className="text-center text-xs text-[var(--text-tertiary)]">
              {allShots.length} shots loaded
            </p>
          )}
        </div>
      )}

      {activeTab === 'rolling' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Stat:</span>
            <select
              value={rollingStat}
              onChange={(e) => setRollingStat(e.target.value as RollingStat)}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
            >
              {Object.entries(statConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {rollingLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : rollingData && rollingData.length > 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <RollingLineChart data={rollingData} stat={rollingStat} />
            </div>
          ) : (
            <div className="py-16 text-center text-[var(--text-secondary)]">No rolling data available</div>
          )}

          {/* Trend cards */}
          {rollingData && rollingData.length > 0 && (() => {
            const latest = rollingData[rollingData.length - 1];
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatTrend label="PTS" current={latest.points_avg_5g} seasonAvg={latest.points_avg_season} />
                <StatTrend label="AST" current={latest.assists_avg_5g} seasonAvg={latest.assists_avg_season} />
                <StatTrend label="REB" current={latest.rebounds_avg_5g} seasonAvg={latest.rebounds_avg_season} />
                <StatTrend label="TS%" current={latest.ts_pct_avg_5g} seasonAvg={latest.ts_pct_avg_season} isPct />
                <StatTrend label="USG" current={latest.usage_avg_5g} seasonAvg={latest.usage_avg_season} isPct />
                <StatTrend label="+/-" current={latest.plus_minus_avg_5g} seasonAvg={latest.plus_minus_avg_season} />
              </div>
            );
          })()}

          {/* Shot quality summary */}
          {shotQuality && shotQuality.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Shot Quality</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Shot Quality Score" value={formatStat(shotQuality[0].shot_quality_score)} />
                <StatCard label="Shot Making Score" value={formatStat(shotQuality[0].shot_making_score)} />
                <StatCard label="PAX/100" value={formatStat(shotQuality[0].pax_per_100_shots)} accent />
                <StatCard label="Points Above Expected" value={formatStat(shotQuality[0].total_points_above_expected, 0)} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
