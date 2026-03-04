'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { COURT, EFFICIENCY_SCALE } from '@/lib/constants';
import type { ShotChartItem } from '@/lib/types';

interface ShotZonesProps {
  shots: ShotChartItem[];
}

interface Zone {
  key: string;
  shots: ShotChartItem[];
  makes: number;
  fgPct: number;
  x: number;
  y: number;
}

export function ShotZones({ shots }: ShotZonesProps) {
  const zones = useMemo(() => {
    const grouped = new Map<string, ShotChartItem[]>();

    for (const shot of shots) {
      const key = `${shot.shot_zone_basic}|${shot.shot_zone_area}|${shot.shot_zone_range}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(shot);
    }

    const overallFgPct = shots.length > 0
      ? shots.filter((s) => s.is_made).length / shots.length
      : 0.45;

    const colorScale = d3.scaleLinear<string>()
      .domain(EFFICIENCY_SCALE.domain.map((d) => d + overallFgPct))
      .range([...EFFICIENCY_SCALE.range])
      .clamp(true);

    const zoneList: (Zone & { color: string })[] = [];

    grouped.forEach((zoneShots, key) => {
      if (zoneShots.length < 3) return;
      const makes = zoneShots.filter((s) => s.is_made).length;
      const fgPct = makes / zoneShots.length;

      // Compute average position of shots in this zone
      const avgX = d3.mean(zoneShots, (s) => (s.loc_x ?? 0) + COURT.OFFSET_X) ?? COURT.BASKET_X;
      const avgY = d3.mean(zoneShots, (s) => (s.loc_y ?? 0) + COURT.OFFSET_Y) ?? COURT.BASKET_Y;

      zoneList.push({
        key,
        shots: zoneShots,
        makes,
        fgPct,
        x: avgX,
        y: avgY,
        color: colorScale(fgPct),
      });
    });

    return zoneList;
  }, [shots]);

  return (
    <>
      {zones.map((zone) => (
        <g key={zone.key}>
          <circle
            cx={zone.x}
            cy={zone.y}
            r={Math.min(30, Math.max(14, Math.sqrt(zone.shots.length) * 4))}
            fill={zone.color}
            opacity={0.5}
          />
          <text
            x={zone.x}
            y={zone.y - 5}
            textAnchor="middle"
            fill="white"
            fontSize={9}
            fontWeight={700}
          >
            {Math.round(zone.fgPct * 100)}%
          </text>
          <text
            x={zone.x}
            y={zone.y + 7}
            textAnchor="middle"
            fill="white"
            fontSize={7}
            opacity={0.8}
          >
            {zone.shots.length} att
          </text>
        </g>
      ))}
    </>
  );
}
