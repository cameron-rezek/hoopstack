'use client';

import { cn } from '@/lib/utils';

export type ShotView = 'scatter' | 'hexbin' | 'zones';
export type ShotFilter = 'all' | '2pt' | '3pt';

interface ShotChartControlsProps {
  view: ShotView;
  onViewChange: (view: ShotView) => void;
  filter: ShotFilter;
  onFilterChange: (filter: ShotFilter) => void;
}

const views: { key: ShotView; label: string }[] = [
  { key: 'scatter', label: 'Scatter' },
  { key: 'hexbin', label: 'Hexbin' },
  { key: 'zones', label: 'Zones' },
];

const filters: { key: ShotFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: '2pt', label: '2PT' },
  { key: '3pt', label: '3PT' },
];

function ButtonGroup<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            active === item.key
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ShotChartControls({
  view, onViewChange, filter, onFilterChange,
}: ShotChartControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">View:</span>
        <ButtonGroup items={views} active={view} onChange={onViewChange} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Filter:</span>
        <ButtonGroup items={filters} active={filter} onChange={onFilterChange} />
      </div>
    </div>
  );
}
