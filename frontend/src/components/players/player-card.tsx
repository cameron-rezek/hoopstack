'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { User } from 'lucide-react';
import { playerHeadshotUrl } from '@/lib/constants';
import type { PlayerSummary } from '@/lib/types';

interface PlayerCardProps {
  player: PlayerSummary;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/players/${player.player_id}`}
      className="flex flex-col items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-colors hover:bg-[var(--bg-elevated)]"
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-8 w-8 text-[var(--text-secondary)]" />
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
      <div className="text-center">
        <div className="text-sm font-medium text-[var(--text-primary)]">
          {player.player_name}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          {[player.team_abbreviation, player.position].filter(Boolean).join(' \u00B7 ')}
        </div>
      </div>
    </Link>
  );
}
