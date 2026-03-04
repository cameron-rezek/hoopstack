'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPlayerShots, fetchGameShots } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import { useSeason } from '@/contexts/season-context';
import type { PaginationParams, ShotChartItem } from '@/lib/types';

export function usePlayerShots(playerId: number, params?: PaginationParams & {
  season?: string;
  season_type?: string;
  game_id?: string;
}) {
  const { season } = useSeason();
  const mergedParams = { season, ...params };
  return useQuery({
    queryKey: ['playerShots', playerId, mergedParams],
    queryFn: () => fetchPlayerShots(playerId, mergedParams),
    enabled: !!playerId,
  });
}

export function useAllPlayerShots(playerId: number, params?: {
  season?: string;
  season_type?: string;
}) {
  const { season } = useSeason();
  const mergedParams = { season, ...params };
  return useQuery<ShotChartItem[]>({
    queryKey: ['allPlayerShots', playerId, mergedParams],
    queryFn: () =>
      fetchAllPages<ShotChartItem>(
        ({ page, per_page }) =>
          fetchPlayerShots(playerId, { ...mergedParams, page, per_page }),
        100,
      ),
    enabled: !!playerId,
    staleTime: 10 * 60 * 1000,
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

export function useAllGameShots(gameId: string, params?: {
  period?: number;
  team_id?: number;
}) {
  return useQuery<ShotChartItem[]>({
    queryKey: ['allGameShots', gameId, params],
    queryFn: () =>
      fetchAllPages<ShotChartItem>(
        ({ page, per_page }) =>
          fetchGameShots(gameId, { ...params, page, per_page }),
        100,
      ),
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000,
  });
}
