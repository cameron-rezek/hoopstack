'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth, fetchShotQualityLeaderboard } from '@/lib/api';
import { useSeason } from '@/contexts/season-context';
import { SearchInput } from '@/components/ui/search-input';
import { formatStat, formatPct } from '@/lib/utils';
import { Activity, Database, Loader2, Users, Crosshair, TrendingUp } from 'lucide-react';

interface HealthData {
  status: string;
  database: string;
  row_counts: Record<string, number>;
}

export default function Home() {
  const router = useRouter();
  const { season } = useSeason();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const { data: topShooters } = useQuery({
    queryKey: ['topShotQuality', season],
    queryFn: () =>
      fetchShotQualityLeaderboard({
        season,
        per_page: 5,
        min_shots: 100,
        sort_by: 'pax_per_100_shots',
      }),
  });

  const handleSearch = (value: string) => {
    if (value.trim()) {
      router.push(`/players?search=${encodeURIComponent(value.trim())}`);
    }
  };

  // Quick stats from row counts
  const totalPlayers = health?.row_counts?.['stg_players'] ?? 0;
  const totalGames = health?.row_counts?.['stg_player_game_logs'] ?? 0;
  const totalShots = health?.row_counts?.['stg_shot_charts'] ?? 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-[var(--text-primary)]">
          Hoopstack
        </h1>
        <p className="text-lg text-[var(--text-secondary)]">
          NBA analytics for the modern fan
        </p>
        <div className="max-w-md">
          <SearchInput
            onChange={handleSearch}
            placeholder="Search for a player..."
          />
        </div>
      </div>

      {/* Quick Stats */}
      {health && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <Users className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Players</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                {totalPlayers.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <Crosshair className="h-8 w-8 text-[var(--success)]" />
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Shot Charts</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                {totalShots.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <TrendingUp className="h-8 w-8 text-[var(--warning)]" />
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Game Logs</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                {totalGames.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Shot Quality Leaders */}
      {topShooters && topShooters.data.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Top Shot Quality ({season})
            </h2>
            <Link href="/leaderboards" className="text-xs text-[var(--accent)] hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {topShooters.data.map((player, i) => (
              <Link
                key={player.player_id}
                href={`/players/${player.player_id}`}
                className="flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <span className="w-6 text-center text-sm font-bold text-[var(--text-secondary)]">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {player.player_name}
                  </span>
                  <span className="ml-2 text-xs text-[var(--text-secondary)]">
                    {player.team_name}
                  </span>
                </div>
                <div className="flex gap-4 text-xs font-mono tabular-nums">
                  <span className="text-[var(--text-secondary)]">
                    {player.total_shots} shots
                  </span>
                  <span className="text-[var(--text-primary)]">
                    {formatPct(player.fg_pct)} FG
                  </span>
                  <span className="font-medium text-[var(--accent)]">
                    {formatStat(player.pax_per_100_shots)} PAX/100
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* API Status */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold">API Status</h2>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking connection...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-[var(--danger)]">
            <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
            Disconnected: {error}
          </div>
        )}

        {health && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
              <span className="text-sm text-[var(--success)]">
                Connected — {health.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Database className="h-4 w-4" />
              Database: {health.database}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(health.row_counts).map(([table, count]) => (
                <div
                  key={table}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3"
                >
                  <div className="text-xs text-[var(--text-secondary)]">{table}</div>
                  <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                    {count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
