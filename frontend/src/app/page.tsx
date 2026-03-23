'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth, fetchSeasons, fetchShotQualityLeaderboard, fetchPlayerShots, fetchPlayers, fetchPlayerRolling } from '@/lib/api';
import { useSeason } from '@/contexts/season-context';
import { formatStat, formatPct, fetchAllPages } from '@/lib/utils';
import { COURT, EFFICIENCY_SCALE, teamLogoUrl, playerHeadshotUrl } from '@/lib/constants';
import {
  Users,
  Crosshair,
  TrendingUp,
  Trophy,
  ArrowRight,
  Loader2,
  Zap,
  Info,
} from 'lucide-react';

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

interface ZoneShot {
  loc_x: number | null;
  loc_y: number | null;
  is_made: boolean;
  shot_zone_basic?: string | null;
  shot_zone_area?: string | null;
  shot_zone_range?: string | null;
}

function MiniCourt({ shots }: { shots: ZoneShot[] }) {
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

  const zones = useMemo(() => {
    const grouped = new Map<string, ZoneShot[]>();
    for (const shot of shots) {
      const key = `${shot.shot_zone_basic}|${shot.shot_zone_area}|${shot.shot_zone_range}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(shot);
    }

    const overallFgPct = shots.length > 0
      ? shots.filter((s) => s.is_made).length / shots.length
      : 0.45;

    const zoneList: { key: string; fgPct: number; count: number; x: number; y: number; color: string }[] = [];

    grouped.forEach((zoneShots, key) => {
      if (zoneShots.length < 3) return;
      const makes = zoneShots.filter((s) => s.is_made).length;
      const fgPct = makes / zoneShots.length;

      let sumX = 0, sumY = 0, valid = 0;
      for (const s of zoneShots) {
        if (s.loc_x !== null && s.loc_y !== null) {
          sumX += s.loc_x + COURT.OFFSET_X;
          sumY += s.loc_y + COURT.OFFSET_Y;
          valid++;
        }
      }
      const avgX = valid > 0 ? sumX / valid : BASKET_X;
      const avgY = valid > 0 ? sumY / valid : BASKET_Y;

      // Efficiency color: red (below avg) -> gray (avg) -> green (above avg)
      const diff = fgPct - overallFgPct;
      const [dLow, dMid, dHigh] = EFFICIENCY_SCALE.domain;
      const [cLow, cMid, cHigh] = EFFICIENCY_SCALE.range;
      let color: string;
      if (diff <= dLow) color = cLow;
      else if (diff >= dHigh) color = cHigh;
      else if (diff <= dMid) {
        const t = (diff - dLow) / (dMid - dLow);
        color = interpolateColor(cLow, cMid, t);
      } else {
        const t = (diff - dMid) / (dHigh - dMid);
        color = interpolateColor(cMid, cHigh, t);
      }

      zoneList.push({ key, fgPct, count: zoneShots.length, x: avgX, y: avgY, color });
    });

    return zoneList;
  }, [shots, BASKET_X, BASKET_Y]);

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

      {zones.map((zone) => (
        <g key={zone.key}>
          <circle
            cx={zone.x}
            cy={zone.y}
            r={Math.min(30, Math.max(14, Math.sqrt(zone.count) * 4))}
            fill={zone.color}
            opacity={0.5}
          />
          <text x={zone.x} y={zone.y - 5} textAnchor="middle" fill="white" fontSize={9} fontWeight={700}>
            {Math.round(zone.fgPct * 100)}%
          </text>
          <text x={zone.x} y={zone.y + 7} textAnchor="middle" fill="white" fontSize={7} opacity={0.8}>
            {zone.count} att
          </text>
        </g>
      ))}
    </svg>
  );
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function Home() {
  const { season } = useSeason();
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: fetchSeasons,
  });

  const { data: topShooters } = useQuery({
    queryKey: ['topShotQuality', season],
    queryFn: () =>
      fetchShotQualityLeaderboard({
        season,
        per_page: 5,
        min_shots: 300,
        sort_by: 'pax_per_100_shots',
      }),
  });

  const isCurrentSeason = seasons && seasons.length > 0 && season === seasons[0];

  // Featured player: hottest scorer (current season) or scoring leader (past seasons)
  const { data: featuredPlayer } = useQuery({
    queryKey: ['featuredPlayer', season, isCurrentSeason],
    queryFn: async () => {
      const players = await fetchPlayers({ sort_by: 'ppg', per_page: 20 });

      if (isCurrentSeason) {
        // Current season: find the player with the biggest 10-game surge
        const rollingResults = await Promise.all(
          players.data.map((p) => fetchPlayerRolling(p.player_id, { season })),
        );

        let best: {
          player_id: number;
          player_name: string;
          team_id: number | null;
          team_name: string | null;
          ppg: number | null;
          rpg: number | null;
          apg: number | null;
          avg10g: number;
          avgSeason: number;
          delta: number;
          isTrending: true;
        } | null = null;

        for (let i = 0; i < players.data.length; i++) {
          const stats = rollingResults[i];
          if (!stats.length) continue;
          const latest = stats[stats.length - 1];
          if (!latest.points_avg_10g || !latest.points_avg_season) continue;
          if (latest.season_game_number < 20) continue;

          const delta = latest.points_avg_10g - latest.points_avg_season;
          if (!best || delta > best.delta) {
            best = {
              player_id: players.data[i].player_id,
              player_name: players.data[i].player_name,
              team_id: players.data[i].team_id,
              team_name: players.data[i].team_name,
              ppg: players.data[i].ppg,
              rpg: players.data[i].rpg,
              apg: players.data[i].apg,
              avg10g: latest.points_avg_10g,
              avgSeason: latest.points_avg_season,
              delta,
              isTrending: true,
            };
          }
        }

        // Fall back to scoring leader if no meaningful surge found
        if (best && best.delta >= 1.5) return best;
      }

      // Past season or no hot streak: show scoring leader
      const leader = players.data[0];
      if (!leader) return null;
      return {
        player_id: leader.player_id,
        player_name: leader.player_name,
        team_id: leader.team_id,
        team_name: leader.team_name,
        ppg: leader.ppg,
        rpg: leader.rpg,
        apg: leader.apg,
        avg10g: 0,
        avgSeason: 0,
        delta: 0,
        isTrending: false as const,
      };
    },
    enabled: seasons !== undefined,
  });

  const featuredPlayerId = featuredPlayer?.player_id;

  const { data: featuredShots } = useQuery({
    queryKey: ['featuredShots', featuredPlayerId, season],
    queryFn: () =>
      fetchAllPages((p) =>
        fetchPlayerShots(featuredPlayerId!, { season, ...p }),
      ),
    enabled: !!featuredPlayerId,
  });

  const totalPlayers = health?.row_counts?.['stg_players'] ?? 0;
  const totalShots = health?.row_counts?.['stg_shot_charts'] ?? 0;
  const totalGames = health?.row_counts?.['fct_player_game_advanced'] ?? 0;
  const totalSeasons = seasons?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Compact Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-8 py-6">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500 opacity-[0.04] blur-3xl" />
        <p className="relative text-base text-[var(--text-secondary)]">
          Shot charts, rolling averages, lineup data, and player comparisons across {totalSeasons || 3} seasons of NBA analytics.
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
              <div className="text-xs font-medium text-[var(--text-secondary)]">Shots Analyzed</div>
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
              <div className="text-xs font-medium text-[var(--text-secondary)]">Games Tracked</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalGames} />
              </div>
            </div>
          </Link>
          <div className="card-glow flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--danger-muted)]">
              <Zap className="h-5 w-5 text-[var(--danger)]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">Seasons</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <AnimatedCounter target={totalSeasons} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Player + Mini Shot Chart */}
      {featuredPlayer && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left: Featured Player */}
          <div className="flex flex-col justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {featuredPlayer.isTrending ? 'Hottest Scorer' : 'Scoring Leader'} — {season}
                </h2>
                {featuredPlayer.isTrending && (
                  <div className="group relative">
                    <button className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
                      <Info className="h-3 w-3" />
                      <span>What is this?</span>
                    </button>
                    <div className="pointer-events-none absolute left-0 top-full z-10 mt-1.5 w-64 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs leading-relaxed text-[var(--text-secondary)] opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                      The hottest scorer among the top 20 PPG leaders. Compares each player{"'"}s last 10 games to their season average and highlights whoever has the biggest scoring surge.
                    </div>
                  </div>
                )}
              </div>
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
                  {featuredPlayer.team_id && (
                    <Image
                      src={teamLogoUrl(featuredPlayer.team_id)}
                      alt={featuredPlayer.team_name ?? ''}
                      width={22}
                      height={22}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span className="text-sm text-[var(--text-secondary)]">{featuredPlayer.team_name}</span>
                </div>

                {featuredPlayer.isTrending ? (
                  <div className="mt-6 grid grid-cols-3 gap-3 font-mono tabular-nums">
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5" title="Average points per game over the last 10 games played">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Last 10</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{formatStat(featuredPlayer.avg10g)} <span className="text-sm font-normal text-[var(--text-tertiary)]">PPG</span></div>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5" title="Average points per game for the full season">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Season</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--text-secondary)]">{formatStat(featuredPlayer.avgSeason)} <span className="text-sm font-normal text-[var(--text-tertiary)]">PPG</span></div>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5" title="Difference between 10-game rolling average and season average — how much hotter (or colder) than usual">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Surge</div>
                      <div className={`mt-1 text-2xl font-semibold ${featuredPlayer.delta >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {featuredPlayer.delta > 0 ? '+' : ''}{formatStat(featuredPlayer.delta)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">vs season avg</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-3 gap-3 font-mono tabular-nums">
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5" title="Average points per game for the season">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">PPG</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--accent)]">{formatStat(featuredPlayer.ppg)}</div>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5" title="Average rebounds per game for the season">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">RPG</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{formatStat(featuredPlayer.rpg)}</div>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-3.5" title="Average assists per game for the season">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">APG</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{formatStat(featuredPlayer.apg)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Mini Shot Chart */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Shot Chart Preview
              </h2>
            </div>
            {featuredShots && featuredShots.length > 0 ? (
              <>
                <MiniCourt shots={featuredShots} />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1" title="Shooting worse than their overall field goal percentage">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: EFFICIENCY_SCALE.range[0] }} />
                      Below avg
                    </span>
                    <span className="flex items-center gap-1" title="Shooting near their overall field goal percentage">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: EFFICIENCY_SCALE.range[1] }} />
                      Average
                    </span>
                    <span className="flex items-center gap-1" title="Shooting better than their overall field goal percentage">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: EFFICIENCY_SCALE.range[2] }} />
                      Above avg
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
              <div className="group relative ml-2">
                <button className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
                  <Info className="h-3 w-3" />
                  <span>What is this?</span>
                </button>
                <div className="pointer-events-none absolute left-0 top-full z-10 mt-1.5 w-72 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs leading-relaxed text-[var(--text-secondary)] opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                  Ranked by PAX/100 (Points Above Expected per 100 shots). This measures how many more points a player scores than a league-average shooter would from the same shot locations. Higher = more efficient shot-making.
                </div>
              </div>
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
                  <span className="text-[var(--text-tertiary)]" title="Total field goal attempts this season">
                    {player.total_shots} shots
                  </span>
                  <div className="relative w-16" title="Field goal percentage — shots made divided by shots attempted">
                    <div className="absolute inset-y-0 left-0 rounded-sm bg-[var(--accent)]/10" style={{ width: `${(player.fg_pct ?? 0) * 100}%` }} />
                    <span className="relative text-[var(--text-secondary)]">
                      {formatPct(player.fg_pct)} FG
                    </span>
                  </div>
                  <span className="font-semibold text-[var(--accent)]" title="Points Above Expected per 100 shots — how many more points scored than a league-average shooter would from the same spots">
                    {formatStat(player.pax_per_100_shots)} PAX/100
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
