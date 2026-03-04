'use client';

import Image from 'next/image';
import { useState } from 'react';
import { teamLogoUrl } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { GameSummary } from '@/lib/types';

function TeamLogo({ teamId, abbreviation }: { teamId: number; abbreviation: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
        <span className="text-lg font-bold text-[var(--text-secondary)]">{abbreviation}</span>
      </div>
    );
  }

  return (
    <Image
      src={teamLogoUrl(teamId)}
      alt={abbreviation}
      width={64}
      height={64}
      unoptimized
      onError={() => setError(true)}
    />
  );
}

interface GameHeaderProps {
  game: GameSummary;
}

export function GameHeader({ game }: GameHeaderProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="flex items-center justify-center gap-8">
        {/* Away team */}
        <div className="flex flex-col items-center gap-2">
          <TeamLogo teamId={game.away_team_id} abbreviation={game.away_team_abbreviation} />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {game.away_team_name}
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-[var(--text-primary)]">
            {game.away_points}
          </span>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-[var(--text-secondary)]">@</div>
        </div>

        {/* Home team */}
        <div className="flex flex-col items-center gap-2">
          <TeamLogo teamId={game.home_team_id} abbreviation={game.home_team_abbreviation} />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {game.home_team_name}
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-[var(--text-primary)]">
            {game.home_points}
          </span>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-[var(--text-secondary)]">
        {formatDate(game.game_date)} &middot; {game.season_type}
      </div>
    </div>
  );
}
