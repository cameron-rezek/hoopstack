'use client';

import Image from 'next/image';
import { useState } from 'react';
import { User } from 'lucide-react';
import { playerHeadshotUrl } from '@/lib/constants';
import type { PlayerDetail } from '@/lib/types';

interface PlayerHeaderProps {
  player: PlayerDetail;
}

export function PlayerHeader({ player }: PlayerHeaderProps) {
  const [imgError, setImgError] = useState(false);

  const details = [
    player.team_name && { label: 'Team', value: player.team_name },
    player.position && { label: 'Position', value: player.position },
    player.jersey_number && { label: 'Number', value: `#${player.jersey_number}` },
    player.height && { label: 'Height', value: player.height },
    player.weight && { label: 'Weight', value: `${player.weight} lbs` },
    player.country && { label: 'Country', value: player.country },
    player.draft_year && {
      label: 'Draft',
      value: `${player.draft_year} R${player.draft_round} Pick ${player.draft_number}`,
    },
    player.seasons_experience != null && {
      label: 'Experience',
      value: `${player.seasons_experience} yr${player.seasons_experience !== 1 ? 's' : ''}`,
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:flex-row sm:items-center">
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-16 w-16 text-[var(--text-secondary)]" />
          </div>
        ) : (
          <Image
            src={playerHeadshotUrl(player.player_id)}
            alt={player.player_name}
            fill
            className="object-cover"
            unoptimized
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {player.player_name}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {[player.team_abbreviation, player.position].filter(Boolean).join(' \u00B7 ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {details.map((d) => (
            <div key={d.label}>
              <span className="text-xs text-[var(--text-secondary)]">{d.label}: </span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
