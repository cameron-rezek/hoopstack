'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchGame, fetchGamePlayers, fetchGameShots, fetchGamePbp } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import type { PaginationParams, ShotChartItem, PlayByPlayEvent } from '@/lib/types';

export function useGame(gameId: string) {
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: () => fetchGame(gameId),
    enabled: !!gameId,
  });
}

export function useGamePlayers(gameId: string) {
  return useQuery({
    queryKey: ['gamePlayers', gameId],
    queryFn: () => fetchGamePlayers(gameId),
    enabled: !!gameId,
  });
}

export function useGameShots(gameId: string, params?: PaginationParams & {
  period?: number;
  team_id?: number;
}) {
  return useQuery({
    queryKey: ['gameShots', gameId, params],
    queryFn: () => fetchGameShots(gameId, params),
    enabled: !!gameId,
  });
}

export function useGamePbp(gameId: string, params?: PaginationParams & {
  period?: number;
}) {
  return useQuery({
    queryKey: ['gamePbp', gameId, params],
    queryFn: () => fetchGamePbp(gameId, params),
    enabled: !!gameId,
  });
}

export function useAllGameShots(gameId: string) {
  return useQuery<ShotChartItem[]>({
    queryKey: ['allGameShots', gameId],
    queryFn: () =>
      fetchAllPages<ShotChartItem>(
        ({ page, per_page }) => fetchGameShots(gameId, { page, per_page }),
        100,
      ),
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAllGamePbp(gameId: string) {
  return useQuery<PlayByPlayEvent[]>({
    queryKey: ['allGamePbp', gameId],
    queryFn: () =>
      fetchAllPages<PlayByPlayEvent>(
        ({ page, per_page }) => fetchGamePbp(gameId, { page, per_page }),
        100,
      ),
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
  });
}
