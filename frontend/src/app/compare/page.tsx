'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, ArrowRightLeft, Search, X } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { usePlayer } from '@/lib/hooks/use-players';
import { useAllPlayerShots } from '@/lib/hooks/use-shots';
import { usePlayerRolling, usePlayerShotQuality } from '@/lib/hooks/use-stats';
import { useSeason } from '@/contexts/season-context';
import { usePlayers } from '@/lib/hooks/use-players';
import { fetchPlayerGames } from '@/lib/api';
import { fetchAllPages } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { playerHeadshotUrl, CHART_COLORS, CHART_THEME } from '@/lib/constants';
import { tooltipStyle } from '@/components/charts/chart-theme';
import { Court } from '@/components/shots/court';
import { ShotScatter } from '@/components/shots/shot-scatter';
import { ShotHexbin } from '@/components/shots/shot-hexbin';
import { ShotZones } from '@/components/shots/shot-zones';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { formatPct, formatStat, cn } from '@/lib/utils';
import type { PlayerDetail, PlayerGameAdvanced, ShotChartItem } from '@/lib/types';
import type { RollingStat } from '@/components/charts/rolling-line-chart';
import { statConfig } from '@/components/charts/rolling-line-chart';

// ── Player Search Picker ────────────────────────────────────

function PlayerPicker({
  selectedPlayer,
  onSelect,
  label,
  accent,
}: {
  selectedPlayer: PlayerDetail | null;
  onSelect: (playerId: number) => void;
  label: string;
  accent: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: results } = usePlayers({
    search: search.length >= 2 ? search : undefined,
    per_page: 8,
  });

  return (
    <div className="relative flex-1">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</label>
      {selectedPlayer ? (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 transition-all hover:border-[var(--border)]" style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
          <PlayerAvatar playerId={selectedPlayer.player_id} name={selectedPlayer.player_name} size={44} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {selectedPlayer.player_name}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {[selectedPlayer.team_abbreviation, selectedPlayer.position].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button
            onClick={() => {
              setSearch('');
              setOpen(true);
              onSelect(0);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search player..."
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]"
            />
          </div>
          {open && search.length >= 2 && results?.data && results.data.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl shadow-black/20 overflow-hidden">
              {results.data.map((p) => (
                <button
                  key={p.player_id}
                  onClick={() => {
                    onSelect(p.player_id);
                    setSearch('');
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <PlayerAvatar playerId={p.player_id} name={p.player_name} size={32} />
                  <div>
                    <div className="text-[var(--text-primary)] font-medium">{p.player_name}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {[p.team_abbreviation, p.position].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Player Avatar ───────────────────────────────────────────

function PlayerAvatar({ playerId, name, size }: { playerId: number; name: string; size: number }) {
  const [err, setErr] = useState(false);
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)] ring-2 ring-[var(--border)]"
      style={{ width: size, height: size }}
    >
      {err ? (
        <div className="flex h-full w-full items-center justify-center">
          <User className="h-1/2 w-1/2 text-[var(--text-tertiary)]" />
        </div>
      ) : (
        <Image
          src={playerHeadshotUrl(playerId)}
          alt={name}
          fill
          className="object-cover"
          unoptimized
          onError={() => setErr(true)}
        />
      )}
    </div>
  );
}

// ── Season Averages (computed from game logs) ───────────────

function usePlayerSeasonAverages(playerId: number) {
  const { season } = useSeason();
  return useQuery({
    queryKey: ['playerSeasonAvg', playerId, season],
    queryFn: async () => {
      const games = await fetchAllPages<PlayerGameAdvanced>(
        ({ page, per_page }) =>
          fetchPlayerGames(playerId, { season, page, per_page }),
        100,
      );
      if (!games.length) return null;
      const n = games.length;
      const sum = (fn: (g: PlayerGameAdvanced) => number | null) =>
        games.reduce((s, g) => s + (fn(g) ?? 0), 0);
      const avg = (fn: (g: PlayerGameAdvanced) => number | null) => sum(fn) / n;

      return {
        games_played: n,
        wins: games.filter((g) => g.win_loss === 'W').length,
        losses: games.filter((g) => g.win_loss === 'L').length,
        ppg: avg((g) => g.points),
        rpg: avg((g) => g.total_rebounds),
        apg: avg((g) => g.assists),
        spg: avg((g) => g.steals),
        bpg: avg((g) => g.blocks),
        topg: avg((g) => g.turnovers),
        mpg: avg((g) => g.minutes_played),
        fpg: avg((g) => g.personal_fouls),
        fgm: avg((g) => g.field_goals_made),
        fga: avg((g) => g.field_goals_attempted),
        fg_pct: sum((g) => g.field_goals_made) / (sum((g) => g.field_goals_attempted) || 1),
        fg3m: avg((g) => g.three_pointers_made),
        fg3a: avg((g) => g.three_pointers_attempted),
        fg3_pct: sum((g) => g.three_pointers_made) / (sum((g) => g.three_pointers_attempted) || 1),
        ftm: avg((g) => g.free_throws_made),
        fta: avg((g) => g.free_throws_attempted),
        ft_pct: sum((g) => g.free_throws_made) / (sum((g) => g.free_throws_attempted) || 1),
        plus_minus: avg((g) => g.plus_minus),
        ts_pct: avg((g) => g.true_shooting_pct),
        usage: avg((g) => g.usage_rate),
        game_score: avg((g) => g.game_score),
      };
    },
    enabled: !!playerId,
    staleTime: 10 * 60 * 1000,
  });
}

type SeasonAverages = NonNullable<ReturnType<typeof usePlayerSeasonAverages>['data']>;

// ── Stat Comparison Bar (CtG-inspired) ──────────────────────

function CompareBar({
  label,
  val1,
  val2,
  format = 'stat',
  higherIsBetter = true,
}: {
  label: string;
  val1: number | null;
  val2: number | null;
  format?: 'stat' | 'pct' | 'pctRaw' | 'plusminus';
  higherIsBetter?: boolean;
}) {
  const v1 = val1 ?? 0;
  const v2 = val2 ?? 0;
  const max = Math.max(Math.abs(v1), Math.abs(v2), 0.001);
  const pct1 = (Math.abs(v1) / max) * 100;
  const pct2 = (Math.abs(v2) / max) * 100;

  const fmt = (v: number | null) => {
    if (v === null) return '\u2014';
    if (format === 'pct') return formatPct(v);
    if (format === 'pctRaw') return `${v.toFixed(1)}%`;
    if (format === 'plusminus') return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
    return formatStat(v);
  };

  const delta = Math.abs(v1 - v2);
  const fmtDelta = () => {
    if (format === 'pct') return `${(delta * 100).toFixed(1)}%`;
    if (format === 'pctRaw') return `${delta.toFixed(1)}%`;
    return delta.toFixed(1);
  };

  const leader1 = higherIsBetter ? v1 > v2 : v1 < v2;
  const leader2 = higherIsBetter ? v2 > v1 : v2 < v1;
  const tie = v1 === v2;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1.5">
      {/* Player 1 bar (grows right to left) */}
      <div className="flex items-center gap-2">
        <span className={cn(
          'font-mono text-sm tabular-nums min-w-[52px] text-right transition-colors',
          leader1 && !tie ? 'font-bold text-[#818cf8]' : 'text-[var(--text-secondary)]',
        )}>
          {fmt(val1)}
        </span>
        <div className="flex-1 flex justify-end">
          <div
            className={cn(
              'h-[22px] rounded-l-md transition-all duration-500',
              leader1 && !tie
                ? 'bg-gradient-to-l from-[#6366f1] to-[#6366f1]/50'
                : 'bg-gradient-to-l from-[#6366f1]/25 to-[#6366f1]/10',
            )}
            style={{ width: `${pct1}%` }}
          />
        </div>
      </div>

      {/* Center label + delta */}
      <div className="flex flex-col items-center min-w-[56px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {label}
        </span>
        {!tie && (
          <span className={cn(
            'text-[10px] font-mono tabular-nums mt-0.5',
            leader1 ? 'text-[#818cf8]/70' : 'text-[#4ade80]/70',
          )}>
            +{fmtDelta()}
          </span>
        )}
      </div>

      {/* Player 2 bar (grows left to right) */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div
            className={cn(
              'h-[22px] rounded-r-md transition-all duration-500',
              leader2 && !tie
                ? 'bg-gradient-to-r from-[#22c55e] to-[#22c55e]/50'
                : 'bg-gradient-to-r from-[#22c55e]/25 to-[#22c55e]/10',
            )}
            style={{ width: `${pct2}%` }}
          />
        </div>
        <span className={cn(
          'font-mono text-sm tabular-nums min-w-[52px] transition-colors',
          leader2 && !tie ? 'font-bold text-[#4ade80]' : 'text-[var(--text-secondary)]',
        )}>
          {fmt(val2)}
        </span>
      </div>
    </div>
  );
}

// Count how many stats one player "wins" in a set of comparisons
function countWins(
  stats: { val1: number | null; val2: number | null; higherIsBetter?: boolean }[],
): [number, number] {
  let w1 = 0, w2 = 0;
  for (const { val1, val2, higherIsBetter = true } of stats) {
    const v1 = val1 ?? 0;
    const v2 = val2 ?? 0;
    if (v1 === v2) continue;
    const p1Leads = higherIsBetter ? v1 > v2 : v1 < v2;
    if (p1Leads) w1++;
    else w2++;
  }
  return [w1, w2];
}

// ── Radar Chart Comparison ──────────────────────────────────

function CompareRadarChart({
  avg1,
  avg2,
  name1,
  name2,
}: {
  avg1: SeasonAverages;
  avg2: SeasonAverages;
  name1: string;
  name2: string;
}) {
  // Normalize stats to 0-100 scale for radar chart
  const stats = [
    { stat: 'Scoring', key: 'ppg', max: 35 },
    { stat: 'Rebounds', key: 'rpg', max: 15 },
    { stat: 'Assists', key: 'apg', max: 12 },
    { stat: 'Efficiency', key: 'ts_pct', max: 0.7 },
    { stat: 'Defense', key: 'combined_def', max: 5 }, // stl + blk
    { stat: 'Impact', key: 'game_score', max: 25 },
  ];

  const data = stats.map(({ stat, key, max }) => {
    let v1: number, v2: number;
    if (key === 'combined_def') {
      v1 = (avg1.spg + avg1.bpg);
      v2 = (avg2.spg + avg2.bpg);
    } else {
      v1 = (avg1 as unknown as Record<string, number>)[key] ?? 0;
      v2 = (avg2 as unknown as Record<string, number>)[key] ?? 0;
    }
    return {
      stat,
      p1: Math.min((v1 / max) * 100, 100),
      p2: Math.min((v2 / max) * 100, 100),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke={CHART_THEME.gridColor} />
        <PolarAngleAxis
          dataKey="stat"
          tick={{ fill: CHART_THEME.textColor, fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          name={name1}
          dataKey="p1"
          stroke={CHART_COLORS[0]}
          fill={CHART_COLORS[0]}
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Radar
          name={name2}
          dataKey="p2"
          stroke={CHART_COLORS[1]}
          fill={CHART_COLORS[1]}
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: CHART_THEME.textColor }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Shot View Toggle ────────────────────────────────────────

type ShotView = 'scatter' | 'hexbin' | 'zones';

function ShotViewToggle({ view, onChange }: { view: ShotView; onChange: (v: ShotView) => void }) {
  const views: { key: ShotView; label: string }[] = [
    { key: 'scatter', label: 'Scatter' },
    { key: 'hexbin', label: 'Hexbin' },
    { key: 'zones', label: 'Zones' },
  ];
  return (
    <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1">
      {views.map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          className={cn(
            'rounded-lg px-4 py-1.5 text-xs font-medium transition-all',
            view === v.key
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

// ── Shot Court Panel ────────────────────────────────────────

function ShotCourtPanel({
  shots,
  view,
  isLoading,
  playerName,
  color,
}: {
  shots: ShotChartItem[];
  view: ShotView;
  isLoading: boolean;
  playerName: string;
  color: string;
}) {
  const stats = useMemo(() => {
    if (!shots.length) return null;
    const total = shots.length;
    const makes = shots.filter((s) => s.is_made).length;
    const threes = shots.filter((s) => s.shot_value === 3);
    const threesMade = threes.filter((s) => s.is_made).length;
    return {
      total,
      fgPct: makes / total,
      threePct: threes.length > 0 ? threesMade / threes.length : null,
    };
  }, [shots]);

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-3 flex items-center justify-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {playerName}
        </h3>
      </div>
      {isLoading ? (
        <Skeleton className="mx-auto h-[300px] max-w-[400px]" />
      ) : (
        <>
          <div className="mx-auto max-w-[400px]">
            <Court>
              {view === 'scatter' && <ShotScatter shots={shots} />}
              {view === 'hexbin' && <ShotHexbin shots={shots} />}
              {view === 'zones' && <ShotZones shots={shots} />}
            </Court>
          </div>
          {stats && (
            <div className="mt-3 flex justify-center gap-5 text-xs">
              <span className="text-[var(--text-tertiary)]">{stats.total} shots</span>
              <span className="font-mono tabular-nums text-[var(--text-secondary)]">{formatPct(stats.fgPct)} FG</span>
              {stats.threePct !== null && (
                <span className="font-mono tabular-nums text-[var(--text-secondary)]">{formatPct(stats.threePct)} 3P</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Comparison Rolling Chart ────────────────────────────────

function CompareRollingChart({
  data1,
  data2,
  name1,
  name2,
  stat,
}: {
  data1: { season_game_number: number; [k: string]: unknown }[];
  data2: { season_game_number: number; [k: string]: unknown }[];
  name1: string;
  name2: string;
  stat: RollingStat;
}) {
  const config = statConfig[stat];

  const merged = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    for (const d of data1) {
      map.set(d.season_game_number, {
        game: d.season_game_number,
        p1: d[config.avg10] as number | null,
      });
    }
    for (const d of data2) {
      const existing = map.get(d.season_game_number) || { game: d.season_game_number };
      map.set(d.season_game_number, {
        ...existing,
        p2: d[config.avg10] as number | null,
      });
    }
    return Array.from(map.values()).sort(
      (a, b) => (a.game as number) - (b.game as number),
    );
  }, [data1, data2, config.avg10]);

  const formatVal = (v: number | null | undefined) => {
    if (v === null || v === undefined) return '';
    if (config.isPct) return `${(v * 100).toFixed(1)}%`;
    if (config.isPctRaw) return `${v.toFixed(1)}%`;
    return v.toFixed(1);
  };

  // Pick ~10 evenly spaced ticks so x-axis stays readable
  const gameNums = merged.map((d) => d.game as number);
  const xTicks = useMemo(() => {
    if (gameNums.length <= 12) return gameNums;
    const step = Math.ceil(gameNums.length / 10);
    const ticks = gameNums.filter((_, i) => i % step === 0);
    // Always include the last game
    const last = gameNums[gameNums.length - 1];
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [gameNums]);

  return (
    <ResponsiveContainer width="100%" height={370}>
      <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
        <XAxis
          dataKey="game"
          ticks={xTicks}
          tick={{ fill: CHART_THEME.textColor, fontSize: 11 }}
          axisLine={{ stroke: CHART_THEME.gridColor }}
          label={{ value: 'Game #', position: 'insideBottom', offset: -15, fill: CHART_THEME.textColor, fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: CHART_THEME.textColor, fontSize: 11 }}
          axisLine={{ stroke: CHART_THEME.gridColor }}
          tickFormatter={(v) => config.isPct ? `${(v * 100).toFixed(0)}%` : config.isPctRaw ? `${v.toFixed(0)}%` : String(v)}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => [formatVal(value as number), '']}
          labelFormatter={(label) => `Game ${label}`}
        />
        <Legend
          verticalAlign="top"
          wrapperStyle={{ fontSize: 12, color: CHART_THEME.textColor, paddingBottom: 8 }}
        />
        <Line
          type="monotone"
          dataKey="p1"
          stroke={CHART_COLORS[0]}
          strokeWidth={2.5}
          dot={false}
          name={name1}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="p2"
          stroke={CHART_COLORS[1]}
          strokeWidth={2.5}
          dot={false}
          name={name2}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Section Card ────────────────────────────────────────────

function SectionCard({
  title,
  children,
  wins,
}: {
  title: string;
  children: React.ReactNode;
  wins?: [number, number];
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{title}</h3>
        {wins && (wins[0] > 0 || wins[1] > 0) && (
          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
            <span className={cn(
              'px-1.5 py-0.5 rounded',
              wins[0] > wins[1] ? 'bg-[#6366f1]/20 text-[#818cf8] font-bold' : 'text-[var(--text-tertiary)]',
            )}>
              {wins[0]}
            </span>
            <span className="text-[var(--text-tertiary)]">—</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded',
              wins[1] > wins[0] ? 'bg-[#22c55e]/20 text-[#4ade80] font-bold' : 'text-[var(--text-tertiary)]',
            )}>
              {wins[1]}
            </span>
          </div>
        )}
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

// ── Main Page Content ───────────────────────────────────────

const compareTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'shots', label: 'Shot Charts' },
  { key: 'rolling', label: 'Rolling Stats' },
];

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const p1Param = searchParams.get('p1');
  const p2Param = searchParams.get('p2');
  const player1Id = p1Param ? parseInt(p1Param, 10) : 0;
  const player2Id = p2Param ? parseInt(p2Param, 10) : 0;

  const [activeTab, setActiveTab] = useState('overview');
  const [shotView, setShotView] = useState<ShotView>('hexbin');
  const [rollingStat, setRollingStat] = useState<RollingStat>('points');
  const { season } = useSeason();

  const updateUrl = useCallback(
    (p1: number, p2: number) => {
      const params = new URLSearchParams();
      if (p1) params.set('p1', String(p1));
      if (p2) params.set('p2', String(p2));
      router.push(`/compare?${params.toString()}`);
    },
    [router],
  );

  // Data hooks
  const { data: player1 } = usePlayer(player1Id);
  const { data: player2 } = usePlayer(player2Id);
  const { data: avg1, isLoading: avg1Loading } = usePlayerSeasonAverages(player1Id);
  const { data: avg2, isLoading: avg2Loading } = usePlayerSeasonAverages(player2Id);
  const { data: shots1, isLoading: shots1Loading } = useAllPlayerShots(player1Id, { season });
  const { data: shots2, isLoading: shots2Loading } = useAllPlayerShots(player2Id, { season });
  const { data: rolling1, isLoading: rolling1Loading } = usePlayerRolling(player1Id, { season });
  const { data: rolling2, isLoading: rolling2Loading } = usePlayerRolling(player2Id, { season });
  const { data: sq1 } = usePlayerShotQuality(player1Id, { season });
  const { data: sq2 } = usePlayerShotQuality(player2Id, { season });

  const bothSelected = player1Id > 0 && player2Id > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Player Comparison
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Compare two players side-by-side for the {season} season
        </p>
      </div>

      {/* Player Selectors */}
      <div className="flex items-end gap-4">
        <PlayerPicker
          selectedPlayer={player1 ?? null}
          onSelect={(id) => updateUrl(id, player2Id)}
          label="Player 1"
          accent={CHART_COLORS[0]}
        />
        <div className="pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]">
            <ArrowRightLeft className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
        </div>
        <PlayerPicker
          selectedPlayer={player2 ?? null}
          onSelect={(id) => updateUrl(player1Id, id)}
          label="Player 2"
          accent={CHART_COLORS[1]}
        />
      </div>

      {!bothSelected && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] py-20">
          <ArrowRightLeft className="h-8 w-8 text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            Select two players above to compare
          </p>
        </div>
      )}

      {bothSelected && (
        <>
          <Tabs tabs={compareTabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Player headers */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="flex items-center gap-3 justify-end">
                  {player1 && (
                    <>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[var(--text-primary)]">{player1.player_name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {[player1.team_abbreviation, player1.position].filter(Boolean).join(' · ')}
                        </div>
                        {avg1 && (
                          <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                            {avg1.games_played}G · {avg1.wins}W-{avg1.losses}L
                          </div>
                        )}
                      </div>
                      <PlayerAvatar playerId={player1.player_id} name={player1.player_name} size={56} />
                    </>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">vs</span>
                </div>
                <div className="flex items-center gap-3">
                  {player2 && (
                    <>
                      <PlayerAvatar playerId={player2.player_id} name={player2.player_name} size={56} />
                      <div>
                        <div className="text-sm font-bold text-[var(--text-primary)]">{player2.player_name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {[player2.team_abbreviation, player2.position].filter(Boolean).join(' · ')}
                        </div>
                        {avg2 && (
                          <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                            {avg2.games_played}G · {avg2.wins}W-{avg2.losses}L
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Radar Chart */}
              {avg1 && avg2 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <CompareRadarChart
                    avg1={avg1}
                    avg2={avg2}
                    name1={player1?.player_name ?? 'Player 1'}
                    name2={player2?.player_name ?? 'Player 2'}
                  />
                </div>
              )}

              {avg1Loading || avg2Loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              ) : avg1 && avg2 ? (
                <>
                  {(() => {
                    const perGameStats = [
                      { val1: avg1.ppg, val2: avg2.ppg },
                      { val1: avg1.rpg, val2: avg2.rpg },
                      { val1: avg1.apg, val2: avg2.apg },
                      { val1: avg1.spg, val2: avg2.spg },
                      { val1: avg1.bpg, val2: avg2.bpg },
                      { val1: avg1.topg, val2: avg2.topg, higherIsBetter: false },
                      { val1: avg1.mpg, val2: avg2.mpg },
                      { val1: avg1.plus_minus, val2: avg2.plus_minus },
                    ];
                    return (
                      <SectionCard title="Per Game Averages" wins={countWins(perGameStats)}>
                        <CompareBar label="PPG" val1={avg1.ppg} val2={avg2.ppg} />
                        <CompareBar label="RPG" val1={avg1.rpg} val2={avg2.rpg} />
                        <CompareBar label="APG" val1={avg1.apg} val2={avg2.apg} />
                        <CompareBar label="SPG" val1={avg1.spg} val2={avg2.spg} />
                        <CompareBar label="BPG" val1={avg1.bpg} val2={avg2.bpg} />
                        <CompareBar label="TOV" val1={avg1.topg} val2={avg2.topg} higherIsBetter={false} />
                        <CompareBar label="MPG" val1={avg1.mpg} val2={avg2.mpg} />
                        <CompareBar label="+/-" val1={avg1.plus_minus} val2={avg2.plus_minus} format="plusminus" />
                      </SectionCard>
                    );
                  })()}

                  {(() => {
                    const shootingStats = [
                      { val1: avg1.fg_pct, val2: avg2.fg_pct },
                      { val1: avg1.fg3_pct, val2: avg2.fg3_pct },
                      { val1: avg1.ft_pct, val2: avg2.ft_pct },
                      { val1: avg1.ts_pct, val2: avg2.ts_pct },
                      { val1: avg1.usage, val2: avg2.usage },
                      { val1: avg1.game_score, val2: avg2.game_score },
                    ];
                    return (
                      <SectionCard title="Shooting Efficiency" wins={countWins(shootingStats)}>
                        <CompareBar label="FG%" val1={avg1.fg_pct} val2={avg2.fg_pct} format="pct" />
                        <CompareBar label="3P%" val1={avg1.fg3_pct} val2={avg2.fg3_pct} format="pct" />
                        <CompareBar label="FT%" val1={avg1.ft_pct} val2={avg2.ft_pct} format="pct" />
                        <CompareBar label="TS%" val1={avg1.ts_pct} val2={avg2.ts_pct} format="pct" />
                        <CompareBar label="USG%" val1={avg1.usage} val2={avg2.usage} format="pctRaw" />
                        <CompareBar label="GmSc" val1={avg1.game_score} val2={avg2.game_score} />
                      </SectionCard>
                    );
                  })()}
                </>
              ) : null}

              {/* Shot quality */}
              {sq1 && sq1.length > 0 && sq2 && sq2.length > 0 && (() => {
                const sqStats = [
                  { val1: sq1[0].pax_per_100_shots, val2: sq2[0].pax_per_100_shots },
                  { val1: sq1[0].shot_quality_score, val2: sq2[0].shot_quality_score },
                  { val1: sq1[0].shot_making_score, val2: sq2[0].shot_making_score },
                ];
                return (
                  <SectionCard title="Shot Quality Metrics" wins={countWins(sqStats)}>
                    <CompareBar label="PAX/100" val1={sq1[0].pax_per_100_shots} val2={sq2[0].pax_per_100_shots} />
                    <CompareBar label="Quality" val1={sq1[0].shot_quality_score} val2={sq2[0].shot_quality_score} />
                    <CompareBar label="Making" val1={sq1[0].shot_making_score} val2={sq2[0].shot_making_score} />
                  </SectionCard>
                );
              })()}
            </div>
          )}

          {/* ── Shot Charts Tab ── */}
          {activeTab === 'shots' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <ShotViewToggle view={shotView} onChange={setShotView} />
              </div>
              <div className="flex gap-4 flex-col md:flex-row">
                <ShotCourtPanel
                  shots={shots1 ?? []}
                  view={shotView}
                  isLoading={shots1Loading}
                  playerName={player1?.player_name ?? ''}
                  color={CHART_COLORS[0]}
                />
                <div className="hidden md:flex items-center">
                  <div className="h-full w-px bg-[var(--border)]" />
                </div>
                <ShotCourtPanel
                  shots={shots2 ?? []}
                  view={shotView}
                  isLoading={shots2Loading}
                  playerName={player2?.player_name ?? ''}
                  color={CHART_COLORS[1]}
                />
              </div>
            </div>
          )}

          {/* ── Rolling Stats Tab ── */}
          {activeTab === 'rolling' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Stat:</span>
                <select
                  value={rollingStat}
                  onChange={(e) => setRollingStat(e.target.value as RollingStat)}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
                >
                  {Object.entries(statConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                <span className="text-xs text-[var(--text-tertiary)]">10-game rolling average</span>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                {rolling1Loading || rolling2Loading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : rolling1 && rolling2 && (rolling1.length > 0 || rolling2.length > 0) ? (
                  <CompareRollingChart
                    data1={rolling1 as unknown as { season_game_number: number; [k: string]: unknown }[]}
                    data2={rolling2 as unknown as { season_game_number: number; [k: string]: unknown }[]}
                    name1={player1?.player_name ?? 'Player 1'}
                    name2={player2?.player_name ?? 'Player 2'}
                    stat={rollingStat}
                  />
                ) : (
                  <div className="py-16 text-center text-[var(--text-secondary)]">
                    No rolling data available
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page Export ──────────────────────────────────────────────

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CompareContent />
    </Suspense>
  );
}
