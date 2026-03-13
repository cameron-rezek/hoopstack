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
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      {/* Gradient banner */}
      <div className="h-20 bg-gradient-to-r from-[var(--accent)] to-purple-600 opacity-20" />

      <div className="flex flex-col gap-5 px-6 pb-6 sm:flex-row sm:items-end -mt-10">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-elevated)] ring-4 ring-[var(--bg-card)] shadow-lg">
          {imgError ? (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-12 w-12 text-[var(--text-tertiary)]" />
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
        <div className="space-y-2.5 pb-1">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {player.player_name}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {[player.team_abbreviation, player.position].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {details.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">{d.label}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
