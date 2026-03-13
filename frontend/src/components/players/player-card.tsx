'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { playerHeadshotUrl, teamLogoUrl } from '@/lib/constants';
import type { PlayerSummary } from '@/lib/types';

interface PlayerCardProps {
  player: PlayerSummary;
  onCompareToggle?: (playerId: number) => void;
  isComparing?: boolean;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PlayerCard({ player, onCompareToggle, isComparing }: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCompareToggle?.(player.player_id);
  };

  return (
    <Link
      href={`/players/${player.player_id}`}
      className="card-glow group relative flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all hover:border-[var(--accent)]/40"
    >
      {/* Headshot with team logo behind */}
      <div className="relative h-14 w-14 shrink-0">
        {/* Team logo background */}
        {player.team_id && !logoError && (
          <Image
            src={teamLogoUrl(player.team_id)}
            alt=""
            fill
            className="object-contain opacity-10"
            unoptimized
            onError={() => setLogoError(true)}
          />
        )}
        <div className="relative h-14 w-14 overflow-hidden rounded-full bg-[var(--bg-elevated)] ring-2 ring-[var(--border)]">
          {imgError ? (
            <div className="flex h-full w-full items-center justify-center bg-[var(--bg-elevated)]">
              <span className="text-sm font-bold text-[var(--text-tertiary)]">
                {getInitials(player.player_name)}
              </span>
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
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {player.player_name}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          {[player.team_abbreviation, player.position].filter(Boolean).join(' · ')}
        </div>
        {/* Stats row */}
        {(player.ppg !== null || player.rpg !== null || player.apg !== null) && (
          <div className="mt-1.5 flex gap-3 text-xs">
            {player.ppg !== null && (
              <span className="text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{player.ppg}</span> pts
              </span>
            )}
            {player.rpg !== null && (
              <span className="text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{player.rpg}</span> reb
              </span>
            )}
            {player.apg !== null && (
              <span className="text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{player.apg}</span> ast
              </span>
            )}
          </div>
        )}
      </div>

      {/* Compare button */}
      {onCompareToggle && (
        <button
          onClick={handleCompareClick}
          className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all ${
            isComparing
              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:border-[var(--accent)] hover:text-[var(--accent)]'
          }`}
        >
          {isComparing ? 'Added' : 'Compare'}
        </button>
      )}
    </Link>
  );
}
