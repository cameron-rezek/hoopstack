'use client';

import { PlayerCard } from './player-card';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import type { PlayerSummary } from '@/lib/types';

interface PlayerSearchResultsProps {
  players: PlayerSummary[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function PlayerSearchResults({
  players,
  page,
  totalPages,
  onPageChange,
  loading,
}: PlayerSearchResultsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (players.length === 0) {
    return <EmptyState message="No players found" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => (
          <PlayerCard key={player.player_id} player={player} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
