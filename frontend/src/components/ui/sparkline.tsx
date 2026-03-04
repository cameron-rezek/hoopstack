'use client';

import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { CHART_COLORS } from '@/lib/constants';

interface SparklineProps {
  data: { value: number | null }[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color = CHART_COLORS[0],
  width = 80,
  height = 24,
}: SparklineProps) {
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
