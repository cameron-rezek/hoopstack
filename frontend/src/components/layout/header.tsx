'use client';

import { SeasonSelector } from './season-selector';

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-primary)]/80 px-6 backdrop-blur-sm">
      <h1 className="text-sm font-medium text-[var(--text-secondary)]">
        NBA Analytics
      </h1>
      <SeasonSelector />
    </header>
  );
}
