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
      className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)] ring-2 ring-[var(--border)]">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-6 w-6 text-[var(--text-tertiary)]" />
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
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {player.player_name}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          {[player.team_abbreviation, player.position].filter(Boolean).join(' · ')}
        </div>
      </div>
    </Link>
  );
}
