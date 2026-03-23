'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LayoutGrid, List, ArrowUpDown, X } from 'lucide-react';
import { PlayerSearchResults } from '@/components/players/player-search-results';
import { usePlayers } from '@/lib/hooks/use-players';
import { useTeams } from '@/lib/hooks/use-teams';
import { Skeleton } from '@/components/ui/loading-skeleton';

const POSITIONS = ['Guard', 'Forward', 'Center'] as const;

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'ppg', label: 'PPG' },
  { value: 'rpg', label: 'RPG' },
  { value: 'apg', label: 'APG' },
  { value: 'gp', label: 'GP' },
  { value: 'fg_pct', label: 'FG%' },
  { value: 'mpg', label: 'MIN' },
  { value: 'spg', label: 'STL' },
  { value: 'bpg', label: 'BLK' },
  { value: 'team', label: 'Team' },
  { value: 'position', label: 'Position' },
] as const;

const MIN_GP_OPTIONS = [
  { value: 0, label: 'All Players' },
  { value: 10, label: '10+ GP' },
  { value: 20, label: '20+ GP' },
  { value: 40, label: '40+ GP' },
  { value: 60, label: '60+ GP' },
] as const;

const PER_PAGE = 24;

function PlayersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSearch = searchParams.get('search') ?? '';

  const search = initialSearch;
  const [page, setPage] = useState(1);
  const [position, setPosition] = useState<string | undefined>();
  const [teamId, setTeamId] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState('name');
  const [minGp, setMinGp] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [compareSet, setCompareSet] = useState<Set<number>>(new Set());

  const { data: teams } = useTeams();

  const { data, isLoading } = usePlayers({
    search: search || undefined,
    page,
    per_page: PER_PAGE,
    position,
    team_id: teamId,
    sort_by: sortBy,
    min_gp: minGp || undefined,
  });

  const handlePositionFilter = (pos: string) => {
    setPosition((prev) => (prev === pos ? undefined : pos));
    setPage(1);
  };

  const handleTeamFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTeamId(val ? Number(val) : undefined);
    setPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(1);
  };

  const handleCompareToggle = useCallback((playerId: number) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else if (next.size < 2) {
        next.add(playerId);
      }
      return next;
    });
  }, []);

  const handleGoCompare = () => {
    const ids = Array.from(compareSet);
    if (ids.length === 2) {
      router.push(`/compare?p1=${ids[0]}&p2=${ids[1]}`);
    }
  };

  const activeFilters = [position, teamId, minGp].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Players</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {data?.total !== undefined
              ? `${data.total.toLocaleString()} players`
              : 'Browse NBA players'}
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Position chips */}
        <div className="flex gap-1.5">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => handlePositionFilter(pos)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                position === pos
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Team dropdown */}
        <select
          value={teamId ?? ''}
          onChange={handleTeamFilter}
          className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 text-xs text-[var(--text-secondary)] outline-none transition-all focus:border-[var(--accent)] hover:border-[var(--accent)]"
        >
          <option value="">All Teams</option>
          {teams
            ?.sort((a, b) => a.team_name.localeCompare(b.team_name))
            .map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.team_abbreviation} — {t.team_name}
              </option>
            ))}
        </select>

        {/* Min GP dropdown */}
        <select
          value={minGp}
          onChange={(e) => { setMinGp(Number(e.target.value)); setPage(1); }}
          className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 text-xs text-[var(--text-secondary)] outline-none transition-all focus:border-[var(--accent)] hover:border-[var(--accent)]"
        >
          {MIN_GP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {activeFilters > 0 && (
          <button
            onClick={() => {
              setPosition(undefined);
              setTeamId(undefined);
              setMinGp(0);
              setPage(1);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 text-xs text-[var(--text-secondary)] outline-none transition-all focus:border-[var(--accent)]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex h-8 w-8 items-center justify-center transition-all ${
              viewMode === 'grid'
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex h-8 w-8 items-center justify-center border-l border-[var(--border)] transition-all ${
              viewMode === 'table'
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Compare bar */}
      {compareSet.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-2.5">
          <span className="text-xs text-[var(--text-secondary)]">
            {compareSet.size}/2 players selected
          </span>
          <button
            onClick={handleGoCompare}
            disabled={compareSet.size < 2}
            className="rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white transition-all hover:brightness-110 disabled:opacity-40"
          >
            Compare
          </button>
          <button
            onClick={() => setCompareSet(new Set())}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Results */}
      <PlayerSearchResults
        players={data?.data ?? []}
        page={data?.page ?? 1}
        totalPages={data?.total_pages ?? 1}
        total={data?.total}
        onPageChange={setPage}
        loading={isLoading}
        viewMode={viewMode}
        compareSet={compareSet}
        onCompareToggle={handleCompareToggle}
        sortBy={sortBy}
        onSortChange={handleSortChange}
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
