'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth, fetchShotQualityLeaderboard, fetchPlayerShots } from '@/lib/api';
import { useSeason } from '@/contexts/season-context';
import { formatStat, formatPct } from '@/lib/utils';
import { COURT, SHOT_COLORS, teamLogoUrl, playerHeadshotUrl } from '@/lib/constants';
import {
  Users,
  Crosshair,
  TrendingUp,
  Trophy,
  ArrowRight,
  Activity,
  Database,
  Loader2,
  Zap,
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

function MiniCourt({ shots }: { shots: { loc_x: number | null; loc_y: number | null; is_made: boolean }[] }) {
  const { WIDTH, HEIGHT, BASKET_X, BASKET_Y, BASKET_RADIUS, BACKBOARD_WIDTH,
    PAINT_WIDTH, PAINT_HEIGHT, FREE_THROW_RADIUS,
    THREE_PT_RADIUS, THREE_PT_SIDE_Y, THREE_PT_SIDE_X,
    RESTRICTED_RADIUS } = COURT;

  const lineColor = 'var(--text-tertiary)';
  const paintFill = 'rgba(99, 102, 241, 0.03)';
  const lineWidth = 1;

  const threeArcStartX = WIDTH / 2 - THREE_PT_SIDE_X;
  const threeArcEndX = WIDTH / 2 + THREE_PT_SIDE_X;
  const threeArcY = THREE_PT_SIDE_Y;

  const threeArc = `M ${threeArcStartX} ${threeArcY} A ${THREE_PT_RADIUS} ${THREE_PT_RADIUS} 0 0 1 ${threeArcEndX} ${threeArcY}`;
  const restrictedArc = `M ${BASKET_X - RESTRICTED_RADIUS} ${BASKET_Y} A ${RESTRICTED_RADIUS} ${RESTRICTED_RADIUS} 0 0 1 ${BASKET_X + RESTRICTED_RADIUS} ${BASKET_Y}`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" width="100%" height="auto">
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="var(--bg-card)" rx={8} />
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="none" stroke={lineColor} strokeWidth={lineWidth} rx={8} />
      <rect x={(WIDTH - PAINT_WIDTH) / 2} y={0} width={PAINT_WIDTH} height={PAINT_HEIGHT} fill={paintFill} stroke={lineColor} strokeWidth={lineWidth} />
      <circle cx={BASKET_X} cy={PAINT_HEIGHT} r={FREE_THROW_RADIUS} fill="none" stroke={lineColor} strokeWidth={lineWidth} strokeDasharray="4 4" />
      <path d={`M ${BASKET_X - FREE_THROW_RADIUS} ${PAINT_HEIGHT} A ${FREE_THROW_RADIUS} ${FREE_THROW_RADIUS} 0 0 1 ${BASKET_X + FREE_THROW_RADIUS} ${PAINT_HEIGHT}`} fill="none" stroke={lineColor} strokeWidth={lineWidth} />
      <line x1={BASKET_X - BACKBOARD_WIDTH / 2} y1={BASKET_Y - 10} x2={BASKET_X + BACKBOARD_WIDTH / 2} y2={BASKET_Y - 10} stroke={lineColor} strokeWidth={lineWidth + 1} />
      <circle cx={BASKET_X} cy={BASKET_Y} r={BASKET_RADIUS} fill="none" stroke={lineColor} strokeWidth={lineWidth + 0.5} />
      <line x1={threeArcStartX} y1={0} x2={threeArcStartX} y2={threeArcY} stroke={lineColor} strokeWidth={lineWidth} />
      <line x1={threeArcEndX} y1={0} x2={threeArcEndX} y2={threeArcY} stroke={lineColor} strokeWidth={lineWidth} />
      <path d={threeArc} fill="none" stroke={lineColor} strokeWidth={lineWidth} />
      <path d={restrictedArc} fill="none" stroke={lineColor} strokeWidth={lineWidth} />

      {shots.map((shot, i) => {
        if (shot.loc_x === null || shot.loc_y === null) return null;
        const cx = shot.loc_x + COURT.OFFSET_X;
        const cy = shot.loc_y + COURT.OFFSET_Y;
        if (cx < 0 || cx > WIDTH || cy < 0 || cy > HEIGHT) return null;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={3}
            fill={shot.is_made ? SHOT_COLORS.made : SHOT_COLORS.missed}
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}

export default function Home() {
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
        min_shots: 300,
        sort_by: 'total_points_above_expected',
      }),
  });

  const featuredPlayer = topShooters?.data?.[0] ?? null;
  const featuredPlayerId = featuredPlayer?.player_id;

  const { data: featuredShots } = useQuery({
    queryKey: ['featuredShots', featuredPlayerId, season],
    queryFn: () =>
      fetchPlayerShots(featuredPlayerId!, {
        season,
        per_page: 100,
      }),
    enabled: !!featuredPlayerId,
  });

  const totalPlayers = health?.row_counts?.['stg_players'] ?? 0;
  const totalShots = health?.row_counts?.['stg_shot_charts'] ?? 0;
  const totalGames = health?.row_counts?.['fct_player_game_advanced'] ?? 0;
  const totalPbp = health?.row_counts?.['stg_play_by_play'] ?? 0;

  return (
    <div className="space-y-6">
      {/* Compact Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-8 py-6">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500 opacity-[0.04] blur-3xl" />
        <p className="relative text-base text-[var(--text-secondary)]">
          Shot charts, rolling averages, lineup data, and player comparisons across 3 seasons of NBA analytics.
        </p>
      </div>

      {/* Stat Cards Row */}
      {health && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Link href="/players" className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--accent)]/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <Users className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">Players Tracked</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalPlayers} />
              </div>
            </div>
          </Link>
          <Link href="/leaderboards" className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--accent)]/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--success-muted)]">
              <Crosshair className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">Shot Charts</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalShots} />
              </div>
            </div>
          </Link>
          <Link href="/players" className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--accent)]/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--warning-muted)]">
              <TrendingUp className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">Game Logs</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalGames} />
              </div>
            </div>
          </Link>
          <Link href="/players" className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--accent)]/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--danger-muted)]">
              <Zap className="h-5 w-5 text-[var(--danger)]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">Play-by-Play</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalPbp} />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Featured Player + Mini Shot Chart */}
      {featuredPlayer && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left: Featured Player + Runners Up */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 flex flex-col justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Featured Player — {season}
                </h2>
                <Link
                  href={`/players/${featuredPlayer.player_id}`}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  View profile
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex items-center gap-7">
                <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <Image
                    src={playerHeadshotUrl(featuredPlayer.player_id)}
                    alt={featuredPlayer.player_name}
                    fill
                    className="object-cover object-top"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-4xl font-bold text-[var(--text-primary)]">
                    {featuredPlayer.player_name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Image
                      src={teamLogoUrl(featuredPlayer.team_id)}
                      alt={featuredPlayer.team_name}
                      width={22}
                      height={22}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-sm text-[var(--text-secondary)]">{featuredPlayer.team_name}</span>
                  </div>
                  <div className="mt-6 grid grid-cols-4 gap-3 font-mono tabular-nums">
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">FG%</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{formatPct(featuredPlayer.fg_pct)}</div>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">PAX/100</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--accent)]">{formatStat(featuredPlayer.pax_per_100_shots)}</div>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Shots</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{featuredPlayer.total_shots.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Quality</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{formatStat(featuredPlayer.shot_quality_score)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Runners Up */}
            {topShooters && topShooters.data.length > 1 && (
              <div className="flex-1 flex flex-col justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                <div className="space-y-2">
                  {topShooters.data.slice(1).map((player, i) => (
                    <Link
                      key={player.player_id}
                      href={`/players/${player.player_id}`}
                      className="flex items-center gap-4 rounded-lg px-3 py-3.5 transition-colors hover:bg-[var(--bg-elevated)]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-sm font-bold text-[var(--text-secondary)]">
                        {i + 2}
                      </span>
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <Image
                          src={playerHeadshotUrl(player.player_id)}
                          alt={player.player_name}
                          fill
                          className="object-cover object-top"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-lg font-medium text-[var(--text-primary)] truncate block">
                          {player.player_name}
                        </span>
                        <span className="text-sm text-[var(--text-tertiary)]">
                          {player.team_name}
                        </span>
                      </div>
                      <span className="font-mono text-base tabular-nums font-semibold text-[var(--accent)]">
                        {formatStat(player.pax_per_100_shots)} PAX/100
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Mini Shot Chart */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Shot Chart Preview
              </h2>
            </div>
            {featuredShots?.data && featuredShots.data.length > 0 ? (
              <>
                <MiniCourt shots={featuredShots.data} />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SHOT_COLORS.made }} />
                      Made
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SHOT_COLORS.missed }} />
                      Missed
                    </span>
                  </div>
                  <Link
                    href={`/players/${featuredPlayer.player_id}`}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                  >
                    View full shot chart
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center text-[var(--text-tertiary)]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

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
                <Image
                  src={teamLogoUrl(player.team_id)}
                  alt={player.team_name}
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {player.player_name}
                  </span>
                  <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                    {player.team_name}
                  </span>
                </div>
                <div className="flex items-center gap-5 text-xs font-mono tabular-nums">
                  <span className="text-[var(--text-tertiary)]">
                    {player.total_shots} shots
                  </span>
                  <div className="relative w-16">
                    <div className="absolute inset-y-0 left-0 rounded-sm bg-[var(--accent)]/10" style={{ width: `${(player.fg_pct ?? 0) * 100}%` }} />
                    <span className="relative text-[var(--text-secondary)]">
                      {formatPct(player.fg_pct)} FG
                    </span>
                  </div>
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
