'use client';

import { useState } from 'react';
import { COURT, SHOT_COLORS } from '@/lib/constants';
import { ShotTooltip } from './shot-tooltip';
import type { ShotChartItem } from '@/lib/types';

interface ShotScatterProps {
  shots: ShotChartItem[];
}

export function ShotScatter({ shots }: ShotScatterProps) {
  const [hovered, setHovered] = useState<{ shot: ShotChartItem; x: number; y: number } | null>(null);

  return (
    <>
      {shots.map((shot, i) => {
        const x = (shot.loc_x ?? 0) + COURT.OFFSET_X;
        const y = (shot.loc_y ?? 0) + COURT.OFFSET_Y;
        const color = shot.is_made ? SHOT_COLORS.made : SHOT_COLORS.missed;

        if (shot.is_made) {
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3}
              fill={color}
              opacity={0.6}
              onMouseEnter={() => setHovered({ shot, x, y })}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            />
          );
        }

        // Missed shots: X mark
        return (
          <g
            key={i}
            onMouseEnter={() => setHovered({ shot, x, y })}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            <line x1={x - 2.5} y1={y - 2.5} x2={x + 2.5} y2={y + 2.5} stroke={color} strokeWidth={1.2} opacity={0.6} />
            <line x1={x + 2.5} y1={y - 2.5} x2={x - 2.5} y2={y + 2.5} stroke={color} strokeWidth={1.2} opacity={0.6} />
          </g>
        );
      })}
      {hovered && <ShotTooltip shot={hovered.shot} x={hovered.x} y={hovered.y} />}
    </>
  );
}
