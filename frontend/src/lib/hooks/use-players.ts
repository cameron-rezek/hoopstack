'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPlayers, fetchPlayer, fetchPlayerGames } from '@/lib/api';
import { useSeason } from '@/contexts/season-context';
import type { PaginationParams } from '@/lib/types';

export function usePlayers(params?: PaginationParams & {
  search?: string;
  team_id?: number;
  position?: string;
}) {
  return useQuery({
    queryKey: ['players', params],
    queryFn: () => fetchPlayers(params),
  });
}

export function usePlayer(playerId: number) {
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => fetchPlayer(playerId),
    enabled: !!playerId,
  });
}

export function usePlayerGames(playerId: number, params?: PaginationParams & {
  season?: string;
  season_type?: string;
}) {
  const { season } = useSeason();
  const mergedParams = { season, ...params };
  return useQuery({
    queryKey: ['playerGames', playerId, mergedParams],
    queryFn: () => fetchPlayerGames(playerId, mergedParams),
    enabled: !!playerId,
  });
}
