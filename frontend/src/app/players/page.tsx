'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchInput } from '@/components/ui/search-input';
import { PlayerSearchResults } from '@/components/players/player-search-results';
import { usePlayers } from '@/lib/hooks/use-players';
import { Skeleton } from '@/components/ui/loading-skeleton';

function PlayersContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePlayers({
    search: search || undefined,
    page,
    per_page: 12,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Players</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Search and browse NBA players
        </p>
      </div>

      <SearchInput
        value={search}
        onChange={handleSearch}
        placeholder="Search players..."
      />

      <PlayerSearchResults
        players={data?.data ?? []}
        page={data?.page ?? 1}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
        loading={isLoading}
      />
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <PlayersContent />
    </Suspense>
  );
}
