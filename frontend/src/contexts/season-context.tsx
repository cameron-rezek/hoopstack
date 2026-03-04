'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { fetchSeasons } from '@/lib/api';
import { DEFAULT_SEASON } from '@/lib/constants';

interface SeasonContextValue {
  season: string;
  setSeason: (season: string) => void;
  seasons: string[];
  loading: boolean;
}

const SeasonContext = createContext<SeasonContextValue>({
  season: DEFAULT_SEASON,
  setSeason: () => {},
  seasons: [],
  loading: true,
});

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasons()
      .then((data) => {
        setSeasons(data);
        if (data.length > 0 && !data.includes(season)) {
          setSeason(data[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SeasonContext.Provider value={{ season, setSeason, seasons, loading }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  return useContext(SeasonContext);
}
