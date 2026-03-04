'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTeams } from '@/lib/hooks/use-teams';
import { teamLogoUrl } from '@/lib/constants';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { Shield } from 'lucide-react';

function TeamCard({ team }: { team: { team_id: number; team_name: string; team_abbreviation: string; city: string | null; conference: string | null; division: string | null } }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/teams/${team.team_id}`}
      className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-colors hover:bg-[var(--bg-elevated)]"
    >
      <div className="relative h-12 w-12 shrink-0">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--bg-elevated)]">
            <Shield className="h-6 w-6 text-[var(--text-secondary)]" />
          </div>
        ) : (
          <Image
            src={teamLogoUrl(team.team_id)}
            alt={team.team_abbreviation}
            width={48}
            height={48}
            unoptimized
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">
          {team.city ? `${team.city} ${team.team_name}` : team.team_name}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          {[team.team_abbreviation, team.conference, team.division].filter(Boolean).join(' \u00B7 ')}
        </div>
      </div>
    </Link>
  );
}

export default function TeamsPage() {
  const { data: teams, isLoading } = useTeams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Teams</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Browse NBA teams
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : teams ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.team_id} team={team} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
