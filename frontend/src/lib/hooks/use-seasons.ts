'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSeasons } from '@/lib/api';

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: fetchSeasons,
    staleTime: 30 * 60 * 1000,
  });
}
