'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { PlayerCard } from './player-card';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { playerHeadshotUrl } from '@/lib/constants';
import type { PlayerSummary } from '@/lib/types';

type ViewMode = 'grid' | 'table';

interface PlayerSearchResultsProps {
  players: PlayerSummary[];
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  viewMode: ViewMode;
  compareSet: Set<number>;
  onCompareToggle: (playerId: number) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

function SortHeader({
  label,
  field,
  currentSort,
  onSort,
  align = 'left',
}: {
  label: string;
  field: string;
  currentSort: string;
  onSort: (field: string) => void;
  align?: 'left' | 'right';
}) {
  const active = currentSort === field;
  return (
    <th
      className={`px-3 py-2 text-xs font-medium cursor-pointer select-none transition-colors hover:text-[var(--text-primary)] ${
        active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
      } ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(field)}
    >
      {label}
      {active && ' ▼'}
    </th>
  );
}

function PlayerTableRow({
  player,
  isComparing,
  onCompareToggle,
}: {
  player: PlayerSummary;
  isComparing: boolean;
  onCompareToggle: (id: number) => void;
}) {
  const [imgError, setImgError] = useState(false);

  const initials = (() => {
    const parts = player.player_name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return player.player_name.slice(0, 2).toUpperCase();
  })();

  return (
    <tr className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-elevated)]/50">
      <td className="px-3 py-2">
        <button
          onClick={() => onCompareToggle(player.player_id)}
          className={`h-4 w-4 rounded border transition-all ${
            isComparing
              ? 'border-[var(--accent)] bg-[var(--accent)]'
              : 'border-[var(--border)] hover:border-[var(--accent)]'
          }`}
        />
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/players/${player.player_id}`}
          className="flex items-center gap-2.5 hover:text-[var(--accent)] transition-colors"
        >
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            {imgError ? (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{initials}</span>
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
          <span className="text-sm font-medium text-[var(--text-primary)]">{player.player_name}</span>
        </Link>
      </td>
      <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{player.team_abbreviation ?? '—'}</td>
      <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{player.position ?? '—'}</td>
      <td className="px-3 py-2 text-right text-sm font-medium text-[var(--text-primary)]">
        {player.ppg?.toFixed(1) ?? '—'}
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-[var(--text-primary)]">
        {player.rpg?.toFixed(1) ?? '—'}
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-[var(--text-primary)]">
        {player.apg?.toFixed(1) ?? '—'}
      </td>
    </tr>
  );
}

export function PlayerSearchResults({
  players,
  page,
  totalPages,
  total,
  onPageChange,
  loading,
  viewMode,
  compareSet,
  onCompareToggle,
  sortBy,
  onSortChange,
}: PlayerSearchResultsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (players.length === 0) {
    return <EmptyState message="No players found" />;
  }

  return (
    <div className="space-y-4">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((player) => (
            <PlayerCard
              key={player.player_id}
              player={player}
              onCompareToggle={onCompareToggle}
              isComparing={compareSet.has(player.player_id)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="w-10 px-3 py-2" />
                <SortHeader label="Player" field="name" currentSort={sortBy} onSort={onSortChange} />
                <SortHeader label="Team" field="team" currentSort={sortBy} onSort={onSortChange} />
                <SortHeader label="Pos" field="position" currentSort={sortBy} onSort={onSortChange} />
                <SortHeader label="PPG" field="ppg" currentSort={sortBy} onSort={onSortChange} align="right" />
                <SortHeader label="RPG" field="rpg" currentSort={sortBy} onSort={onSortChange} align="right" />
                <SortHeader label="APG" field="apg" currentSort={sortBy} onSort={onSortChange} align="right" />
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <PlayerTableRow
                  key={player.player_id}
                  player={player}
                  isComparing={compareSet.has(player.player_id)}
                  onCompareToggle={onCompareToggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
  );
}
