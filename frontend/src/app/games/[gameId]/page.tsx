'use client';

import { use, useState } from 'react';
import { useGame, useGamePlayers, useAllGameShots, useAllGamePbp } from '@/lib/hooks/use-games';
import { GameHeader } from '@/components/games/game-header';
import { BoxScoreTable } from '@/components/games/box-score-table';
import { Court } from '@/components/shots/court';
import { GameFlowChart } from '@/components/charts/game-flow-chart';
import { PbpFeed } from '@/components/games/pbp-feed';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { ErrorDisplay } from '@/components/ui/error-display';
import { COURT } from '@/lib/constants';
import type { ShotChartItem } from '@/lib/types';

const tabs = [
  { key: 'boxscore', label: 'Box Score' },
  { key: 'shots', label: 'Shot Chart' },
  { key: 'flow', label: 'Game Flow' },
  { key: 'pbp', label: 'Play-by-Play' },
];

function GameShotScatter({ shots, homeTeamId }: { shots: ShotChartItem[]; homeTeamId: number }) {
  return (
    <>
      {shots.map((shot, i) => {
        const x = (shot.loc_x ?? 0) + COURT.OFFSET_X;
        const y = (shot.loc_y ?? 0) + COURT.OFFSET_Y;
        const isHome = shot.team_id === homeTeamId;
        const color = isHome ? '#6366f1' : '#f59e0b';

        if (shot.is_made) {
          return <circle key={i} cx={x} cy={y} r={3} fill={color} opacity={0.7} />;
        }
        return (
          <g key={i}>
            <line x1={x - 2.5} y1={y - 2.5} x2={x + 2.5} y2={y + 2.5} stroke={color} strokeWidth={1.2} opacity={0.5} />
            <line x1={x + 2.5} y1={y - 2.5} x2={x - 2.5} y2={y + 2.5} stroke={color} strokeWidth={1.2} opacity={0.5} />
          </g>
        );
      })}
    </>
  );
}

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState('boxscore');

  const { data: game, isLoading: gameLoading, error: gameError } = useGame(gameId);
  const { data: players, isLoading: playersLoading } = useGamePlayers(gameId);
  const { data: shots, isLoading: shotsLoading } = useAllGameShots(gameId);
  const { data: pbpEvents, isLoading: pbpLoading } = useAllGamePbp(gameId);

  if (gameError) {
    return <ErrorDisplay message="Failed to load game" />;
  }

  return (
    <div className="space-y-6">
      {gameLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : game ? (
        <GameHeader game={game} />
      ) : null}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'boxscore' && (
        playersLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : players && game ? (
          <BoxScoreTable players={players} homeTeamId={game.home_team_id} />
        ) : null
      )}

      {activeTab === 'shots' && (
        shotsLoading ? (
          <Skeleton className="mx-auto h-[470px] max-w-[500px]" />
        ) : shots && game ? (
          <div className="mx-auto max-w-[600px]">
            <Court>
              <GameShotScatter shots={shots} homeTeamId={game.home_team_id} />
            </Court>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-[#6366f1]" />
                {game.home_team_abbreviation} (Home)
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-[#f59e0b]" />
                {game.away_team_abbreviation} (Away)
              </span>
            </div>
          </div>
        ) : null
      )}

      {activeTab === 'flow' && (
        pbpLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : pbpEvents && pbpEvents.length > 0 ? (
          <div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <GameFlowChart events={pbpEvents} />
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span>Positive = Home leading</span>
              <span>|</span>
              <span>Negative = Away leading</span>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-[var(--text-secondary)]">No play-by-play data</div>
        )
      )}

      {activeTab === 'pbp' && (
        pbpLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : pbpEvents && pbpEvents.length > 0 ? (
          <PbpFeed events={pbpEvents} />
        ) : (
          <div className="py-16 text-center text-[var(--text-secondary)]">No play-by-play data</div>
        )
      )}
    </div>
  );
}
