import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPct(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '\u2014';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatStat(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '\u2014';
  return value.toFixed(decimals);
}

export function formatPlusMinus(value: number | null): string {
  if (value === null || value === undefined) return '\u2014';
  return value > 0 ? `+${value}` : `${value}`;
}

export function parsePbpClock(clock: string | null): string {
  if (!clock) return '';
  const match = clock.match(/PT(\d+)M([\d.]+)S/);
  if (!match) return clock;
  const minutes = match[1];
  const seconds = Math.floor(parseFloat(match[2])).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export async function fetchAllPages<T>(
  fetcher: (params: { page: number; per_page: number }) => Promise<{ data: T[]; total_pages: number }>,
  perPage = 100,
): Promise<T[]> {
  const first = await fetcher({ page: 1, per_page: perPage });
  const allData = [...first.data];
  const promises: Promise<{ data: T[] }>[] = [];
  for (let p = 2; p <= first.total_pages; p++) {
    promises.push(fetcher({ page: p, per_page: perPage }));
  }
  const results = await Promise.all(promises);
  for (const r of results) {
    allData.push(...r.data);
  }
  return allData;
}
