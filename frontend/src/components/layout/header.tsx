'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SeasonSelector } from './season-selector';
import { SearchInput } from '@/components/ui/search-input';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/players': 'Players',
  '/teams': 'Teams',
  '/compare': 'Player Comparison',
  '/leaderboards': 'Leaderboards',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Dynamic routes
  if (pathname.startsWith('/players/')) return 'Player Profile';
  if (pathname.startsWith('/teams/')) return 'Team Detail';
  if (pathname.startsWith('/games/')) return 'Game Detail';
  return 'NBA Analytics';
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const title = getPageTitle(pathname);

  const handleSearch = (value: string) => {
    if (value.trim()) {
      router.push(`/players?search=${encodeURIComponent(value.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/85 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
      </div>
      <div className="hidden md:block w-full max-w-xs mx-6">
        <SearchInput
          onChange={handleSearch}
          placeholder="Search players..."
          debounceMs={300}
        />
      </div>
      <SeasonSelector />
    </header>
  );
}
