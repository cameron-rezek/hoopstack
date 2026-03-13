'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth, fetchShotQualityLeaderboard } from '@/lib/api';
import { useSeason } from '@/contexts/season-context';
import { SearchInput } from '@/components/ui/search-input';
import { formatStat, formatPct } from '@/lib/utils';
import {
  Users,
  Crosshair,
  TrendingUp,
  ArrowRightLeft,
  Trophy,
  Shield,
  ArrowRight,
  Activity,
  Database,
  Loader2,
} from 'lucide-react';

interface HealthData {
  status: string;
  database: string;
  row_counts: Record<string, number>;
}

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{count.toLocaleString()}</>;
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

  const totalPlayers = health?.row_counts?.['stg_players'] ?? 0;
  const totalGames = health?.row_counts?.['stg_player_game_logs'] ?? 0;
  const totalShots = health?.row_counts?.['stg_shot_charts'] ?? 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 md:p-12">
        {/* Background decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500 opacity-[0.04] blur-3xl" />

        <div className="relative space-y-5">
          <div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              <span className="gradient-text">Hoopstack</span>
            </h1>
            <p className="mt-3 max-w-lg text-base text-[var(--text-secondary)]">
              Advanced NBA analytics — shot charts, rolling averages, lineup data, and player comparisons across 3 seasons of detailed data.
            </p>
          </div>
          <div className="max-w-md">
            <SearchInput
              onChange={handleSearch}
              placeholder="Search for a player..."
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {health && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <Users className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">Players Tracked</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalPlayers} />
              </div>
            </div>
          </div>
          <div className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--success-muted)]">
              <Crosshair className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">Shot Charts</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalShots} />
              </div>
            </div>
          </div>
          <div className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--warning-muted)]">
              <TrendingUp className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">Game Logs</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalGames} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/players"
          className="card-glow group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <Users className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Players</h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Search & browse player profiles</p>
          </div>
        </Link>
        <Link
          href="/teams"
          className="card-glow group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-muted)]">
              <Shield className="h-5 w-5 text-[var(--success)]" />
            </div>
            <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Teams</h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Game logs & lineup analysis</p>
          </div>
        </Link>
        <Link
          href="/compare"
          className="card-glow group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning-muted)]">
              <ArrowRightLeft className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Compare</h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Side-by-side player comparison</p>
          </div>
        </Link>
        <Link
          href="/leaderboards"
          className="card-glow group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--danger-muted)]">
              <Trophy className="h-5 w-5 text-[var(--danger)]" />
            </div>
            <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Leaderboards</h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Shot quality & lineup rankings</p>
          </div>
        </Link>
      </div>

      {/* Top Shot Quality Leaders */}
      {topShooters && topShooters.data.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                <Trophy className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Top Shot Quality
                <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">{season}</span>
              </h2>
            </div>
            <Link href="/leaderboards" className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {topShooters.data.map((player, i) => (
              <Link
                key={player.player_id}
                href={`/players/${player.player_id}`}
                className="flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? 'bg-[var(--accent-muted)] text-[var(--accent)]' :
                  i === 1 ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' :
                  'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {player.player_name}
                  </span>
                  <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                    {player.team_name}
                  </span>
                </div>
                <div className="flex gap-5 text-xs font-mono tabular-nums">
                  <span className="text-[var(--text-tertiary)]">
                    {player.total_shots} shots
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {formatPct(player.fg_pct)} FG
                  </span>
                  <span className="font-semibold text-[var(--accent)]">
                    {formatStat(player.pax_per_100_shots)} PAX/100
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* API Status */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elevated)]">
            <Activity className="h-4 w-4 text-[var(--text-secondary)]" />
          </div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">System Status</h2>
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
                </span>
                <span className="text-sm text-[var(--success)]">Connected</span>
              </div>
              <span className="text-sm text-[var(--text-tertiary)]">|</span>
              <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <Database className="h-3.5 w-3.5" />
                {health.database}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries(health.row_counts).map(([table, count]) => (
                <div
                  key={table}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                >
                  <div className="truncate text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{table}</div>
                  <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--text-primary)]">
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
