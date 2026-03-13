'use client';

import { EFFICIENCY_SCALE } from '@/lib/constants';

interface EfficiencyLegendProps {
  label?: string;
}

export function EfficiencyLegend({ label = 'Efficiency vs Player Avg' }: EfficiencyLegendProps) {
  const stops = [
    { offset: '0%', color: EFFICIENCY_SCALE.range[0] },
    { offset: '50%', color: EFFICIENCY_SCALE.range[1] },
    { offset: '100%', color: EFFICIENCY_SCALE.range[2] },
  ];

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] tabular-nums text-[var(--text-tertiary)]">-10%</span>
        <svg width="120" height="10" className="rounded-sm overflow-hidden">
          <defs>
            <linearGradient id="efficiency-gradient">
              {stops.map((s) => (
                <stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
          </defs>
          <rect width="120" height="10" fill="url(#efficiency-gradient)" rx="2" />
        </svg>
        <span className="text-[10px] tabular-nums text-[var(--text-tertiary)]">+10%</span>
      </div>
    </div>
  );
}
