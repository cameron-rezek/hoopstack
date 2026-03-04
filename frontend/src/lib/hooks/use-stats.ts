'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPlayerRolling, fetchPlayerShotQuality } from '@/lib/api';
import { useSeason } from '@/contexts/season-context';

export function usePlayerRolling(playerId: number, params?: {
  season?: string;
  season_type?: string;
}) {
  const { season } = useSeason();
  const mergedParams = { season, ...params };
  return useQuery({
    queryKey: ['playerRolling', playerId, mergedParams],
    queryFn: () => fetchPlayerRolling(playerId, mergedParams),
    enabled: !!playerId,
  });
}

export function usePlayerShotQuality(playerId: number, params?: {
  season?: string;
  season_type?: string;
}) {
  const { season } = useSeason();
  const mergedParams = { season, ...params };
  return useQuery({
    queryKey: ['playerShotQuality', playerId, mergedParams],
    queryFn: () => fetchPlayerShotQuality(playerId, mergedParams),
    enabled: !!playerId,
  });
}
