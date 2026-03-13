'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchShotQualityLeaderboard } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import { useSeason } from '@/contexts/season-context';
import type { ShotQuality } from '@/lib/types';

const MIN_SHOTS = 50;

export function useShotQualityPercentiles(playerId: number) {
  const { season } = useSeason();

  const { data: allPlayers } = useQuery<ShotQuality[]>({
    queryKey: ['shotQualityAll', season],
    queryFn: () =>
      fetchAllPages<ShotQuality>(
        ({ page, per_page }) =>
          fetchShotQualityLeaderboard({ season, min_shots: MIN_SHOTS, page, per_page }),
        100,
      ),
    staleTime: 10 * 60 * 1000,
  });

  if (!allPlayers || allPlayers.length === 0) return null;

  const player = allPlayers.find((p) => p.player_id === playerId);
  if (!player) return null;

  function computePercentile(
    value: number | null,
    getter: (p: ShotQuality) => number | null,
  ): number | null {
    if (value === null) return null;
    const values = allPlayers!
      .map(getter)
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    const below = values.filter((v) => v < value).length;
    return (below / values.length) * 100;
  }

  return {
    fgPct: computePercentile(player.fg_pct, (p) => p.fg_pct),
    shotQuality: computePercentile(player.shot_quality_score, (p) => p.shot_quality_score),
    shotMaking: computePercentile(player.shot_making_score, (p) => p.shot_making_score),
    paxPer100: computePercentile(player.pax_per_100_shots, (p) => p.pax_per_100_shots),
    totalPax: computePercentile(player.total_points_above_expected, (p) => p.total_points_above_expected),
  };
}
