'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { CHART_COLORS, CHART_THEME } from '@/lib/constants';
import { chartMargin, tooltipStyle } from './chart-theme';
import type { PlayerRollingStats } from '@/lib/types';

export type RollingStat =
  | 'points'
  | 'assists'
  | 'total_rebounds'
  | 'true_shooting_pct'
  | 'usage_rate'
  | 'game_score'
  | 'plus_minus';

const statConfig: Record<RollingStat, {
  label: string;
  game: string;
  avg5: string;
  avg10: string;
  avg20: string;
  season: string;
  isPct?: boolean;
}> = {
  points: { label: 'Points', game: 'points', avg5: 'points_avg_5g', avg10: 'points_avg_10g', avg20: 'points_avg_20g', season: 'points_avg_season' },
  assists: { label: 'Assists', game: 'assists', avg5: 'assists_avg_5g', avg10: 'assists_avg_10g', avg20: 'assists_avg_20g', season: 'assists_avg_season' },
  total_rebounds: { label: 'Rebounds', game: 'total_rebounds', avg5: 'rebounds_avg_5g', avg10: 'rebounds_avg_10g', avg20: 'rebounds_avg_20g', season: 'rebounds_avg_season' },
  true_shooting_pct: { label: 'TS%', game: 'true_shooting_pct', avg5: 'ts_pct_avg_5g', avg10: 'ts_pct_avg_10g', avg20: 'ts_pct_avg_20g', season: 'ts_pct_avg_season', isPct: true },
  usage_rate: { label: 'Usage Rate', game: 'usage_rate', avg5: 'usage_avg_5g', avg10: 'usage_avg_10g', avg20: 'usage_avg_20g', season: 'usage_avg_season', isPct: true },
  game_score: { label: 'Game Score', game: 'game_score', avg5: 'game_score_avg_5g', avg10: 'game_score_avg_10g', avg20: 'game_score_avg_20g', season: 'game_score_avg_season' },
  plus_minus: { label: '+/-', game: 'plus_minus', avg5: 'plus_minus_avg_5g', avg10: 'plus_minus_avg_10g', avg20: 'plus_minus_avg_20g', season: 'plus_minus_avg_season' },
};

interface RollingLineChartProps {
  data: PlayerRollingStats[];
  stat: RollingStat;
}

export function RollingLineChart({ data, stat }: RollingLineChartProps) {
  const config = statConfig[stat];
  const seasonAvg = data.length > 0
    ? (data[data.length - 1] as unknown as Record<string, unknown>)[config.season] as number | null
    : null;

  const formatVal = (v: number | null | undefined) => {
    if (v === null || v === undefined) return '';
    if (config.isPct) return `${(v * 100).toFixed(1)}%`;
    return v.toFixed(1);
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={chartMargin}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
        <XAxis
          dataKey="season_game_number"
          tick={{ fill: CHART_THEME.textColor, fontSize: 11 }}
          axisLine={{ stroke: CHART_THEME.gridColor }}
          label={{ value: 'Game #', position: 'bottom', fill: CHART_THEME.textColor, fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: CHART_THEME.textColor, fontSize: 11 }}
          axisLine={{ stroke: CHART_THEME.gridColor }}
          tickFormatter={(v) => config.isPct ? `${(v * 100).toFixed(0)}%` : String(v)}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => [formatVal(value as number), '']}
          labelFormatter={(label) => `Game ${label}`}
        />

        {/* Per-game values as faded dots */}
        <Line
          type="monotone"
          dataKey={config.game}
          stroke={CHART_COLORS[0]}
          strokeWidth={0}
          dot={{ r: 2, fill: CHART_COLORS[0], opacity: 0.3 }}
          activeDot={{ r: 4 }}
          name="Per Game"
        />

        {/* Rolling averages */}
        <Line type="monotone" dataKey={config.avg5} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} name="5-Game Avg" />
        <Line type="monotone" dataKey={config.avg10} stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} name="10-Game Avg" />
        <Line type="monotone" dataKey={config.avg20} stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} name="20-Game Avg" />

        {/* Season average reference line */}
        {seasonAvg !== null && (
          <ReferenceLine
            y={seasonAvg}
            stroke={CHART_COLORS[3]}
            strokeDasharray="6 4"
            label={{ value: `Season: ${formatVal(seasonAvg)}`, fill: CHART_COLORS[3], fontSize: 10, position: 'right' }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export { statConfig };
