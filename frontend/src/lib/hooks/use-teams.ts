'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTeams, fetchTeam, fetchTeamGames, fetchTeamLineups } from '@/lib/api';
import { useSeason } from '@/contexts/season-context';
import type { PaginationParams } from '@/lib/types';

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 30 * 60 * 1000,
  });
}

export function useTeam(teamId: number) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId),
    enabled: !!teamId,
  });
}

export function useTeamGames(teamId: number, params?: PaginationParams & {
  season?: string;
  season_type?: string;
}) {
  const { season } = useSeason();
  const mergedParams = { season, ...params };
  return useQuery({
    queryKey: ['teamGames', teamId, mergedParams],
    queryFn: () => fetchTeamGames(teamId, mergedParams),
    enabled: !!teamId,
  });
}

export function useTeamLineups(teamId: number, params?: PaginationParams & {
  season?: string;
  season_type?: string;
  min_minutes?: number;
}) {
  const { season } = useSeason();
  const mergedParams = { season, ...params };
  return useQuery({
    queryKey: ['teamLineups', teamId, mergedParams],
    queryFn: () => fetchTeamLineups(teamId, mergedParams),
    enabled: !!teamId,
  });
}
