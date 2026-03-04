'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { CHART_THEME } from '@/lib/constants';
import { chartMargin, tooltipStyle } from './chart-theme';
import type { PlayByPlayEvent } from '@/lib/types';

interface GameFlowChartProps {
  events: PlayByPlayEvent[];
}

export function GameFlowChart({ events }: GameFlowChartProps) {
  // Filter to events with score data and forward-fill differential
  const data: { idx: number; diff: number; period: number }[] = [];
  let lastDiff = 0;

  for (const event of events) {
    if (event.score_differential !== null) {
      lastDiff = event.score_differential;
    }
    data.push({
      idx: event.action_number,
      diff: lastDiff,
      period: event.period,
    });
  }

  // Find period boundaries for reference lines
  const periodBoundaries: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].period !== data[i - 1].period) {
      periodBoundaries.push(data[i].idx);
    }
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={chartMargin}>
        <defs>
          <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.4} />
            <stop offset="50%" stopColor="transparent" stopOpacity={0} />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
        <XAxis
          dataKey="idx"
          tick={{ fill: CHART_THEME.textColor, fontSize: 10 }}
          axisLine={{ stroke: CHART_THEME.gridColor }}
          tickFormatter={() => ''}
        />
        <YAxis
          tick={{ fill: CHART_THEME.textColor, fontSize: 10 }}
          axisLine={{ stroke: CHART_THEME.gridColor }}
          tickFormatter={(v) => (v > 0 ? `+${v}` : String(v))}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => [`${Number(value) > 0 ? '+' : ''}${value}`, 'Differential']}
          labelFormatter={() => ''}
        />
        <ReferenceLine y={0} stroke={CHART_THEME.textColor} strokeWidth={1} />
        {periodBoundaries.map((x) => (
          <ReferenceLine key={x} x={x} stroke={CHART_THEME.gridColor} strokeDasharray="4 4" />
        ))}
        <Area
          type="monotone"
          dataKey="diff"
          stroke="var(--accent)"
          strokeWidth={1.5}
          fill="url(#flowGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
