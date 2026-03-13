'use client';

import { useMemo } from 'react';
import { hexbin as d3Hexbin } from 'd3-hexbin';
import * as d3 from 'd3';
import { COURT, EFFICIENCY_SCALE } from '@/lib/constants';
import type { ShotChartItem } from '@/lib/types';

interface ShotHexbinProps {
  shots: ShotChartItem[];
}

export function ShotHexbin({ shots }: ShotHexbinProps) {
  const hexbins = useMemo(() => {
    const hexbinGen = d3Hexbin<ShotChartItem>()
      .x((d) => (d.loc_x ?? 0) + COURT.OFFSET_X)
      .y((d) => (d.loc_y ?? 0) + COURT.OFFSET_Y)
      .radius(10)
      .extent([[0, 0], [COURT.WIDTH, COURT.HEIGHT]]);

    const bins = hexbinGen(shots);

    // Color scale: FG% difference from avg
    const overallFgPct = shots.length > 0
      ? shots.filter((s) => s.is_made).length / shots.length
      : 0.45;

    const colorScale = d3.scaleLinear<string>()
      .domain(EFFICIENCY_SCALE.domain.map((d) => d + overallFgPct))
      .range([...EFFICIENCY_SCALE.range])
      .clamp(true);

    // Size scale based on frequency
    const maxCount = d3.max(bins, (b) => b.length) ?? 1;
    const sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([0, 10]);

    return bins
      .filter((b) => b.length >= 2)
      .map((b) => {
        const makes = b.filter((s) => s.is_made).length;
        const fgPct = makes / b.length;
        return {
          x: b.x,
          y: b.y,
          count: b.length,
          fgPct,
          color: colorScale(fgPct),
          radius: sizeScale(b.length),
          path: hexbinGen.hexagon(sizeScale(b.length)),
        };
      });
  }, [shots]);

  return (
    <>
      {hexbins.map((hex, i) => (
        <g key={i} transform={`translate(${hex.x},${hex.y})`}>
          <path d={hex.path ?? ''} fill={hex.color} opacity={0.8} stroke="var(--bg-card)" strokeWidth={0.5} />
          {hex.radius > 8 && (
            <text
              textAnchor="middle"
              dy="0.35em"
              fill="white"
              fontSize={7}
              fontWeight={600}
            >
              {Math.round(hex.fgPct * 100)}%
            </text>
          )}
        </g>
      ))}
    </>
  );
}
