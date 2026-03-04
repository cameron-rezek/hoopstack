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
    <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            active === item.key
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]',
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
      <div>
        <span className="mr-2 text-xs text-[var(--text-secondary)]">View:</span>
        <ButtonGroup items={views} active={view} onChange={onViewChange} />
      </div>
      <div>
        <span className="mr-2 text-xs text-[var(--text-secondary)]">Filter:</span>
        <ButtonGroup items={filters} active={filter} onChange={onFilterChange} />
      </div>
    </div>
  );
}
