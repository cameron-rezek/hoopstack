'use client';

import { cn } from '@/lib/utils';

interface TabsProps {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
            activeTab === tab.key
              ? 'bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent-glow)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
