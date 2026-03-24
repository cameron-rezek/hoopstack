import type {
  PaginatedResponse, PaginationParams,
  PlayerSummary, PlayerDetail, PlayerGameAdvanced,
  ShotChartItem, ShotQuality, PlayerRollingStats,
  TeamSummary, TeamGameLog, LineupStats,
  GameSummary, PlayByPlayEvent,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

// ── Helpers ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJson<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json();
}

// ── Health ──────────────────────────────────────────────────

export function fetchHealth() {
  return fetchJson<{ status: string; database: string; row_counts: Record<string, number> }>('/health');
}

// ── Seasons ─────────────────────────────────────────────────

export function fetchSeasons() {
  return fetchJson<string[]>('/seasons');
}

// ── Players ─────────────────────────────────────────────────

export function fetchPlayers(params?: PaginationParams & {
  search?: string;
  team_id?: number;
  position?: string;
  sort_by?: string;
  season?: string;
  min_gp?: number;
}) {
  return fetchJson<PaginatedResponse<PlayerSummary>>('/players', params);
}

export function fetchPlayer(playerId: number) {
  return fetchJson<PlayerDetail>(`/players/${playerId}`);
}

export function fetchPlayerGames(playerId: number, params?: PaginationParams & {
  season?: string;
  season_type?: string;
}) {
  return fetchJson<PaginatedResponse<PlayerGameAdvanced>>(`/players/${playerId}/games`, params);
}

export function fetchPlayerShots(playerId: number, params?: PaginationParams & {
  season?: string;
  season_type?: string;
  game_id?: string;
}) {
  return fetchJson<PaginatedResponse<ShotChartItem>>(`/players/${playerId}/shots`, params);
}

export function fetchPlayerShotQuality(playerId: number, params?: {
  season?: string;
  season_type?: string;
}) {
  return fetchJson<ShotQuality[]>(`/players/${playerId}/shot-quality`, params);
}

export function fetchPlayerRolling(playerId: number, params?: {
  season?: string;
  season_type?: string;
}) {
  return fetchJson<PlayerRollingStats[]>(`/players/${playerId}/rolling`, params);
}

// ── Teams ───────────────────────────────────────────────────

export function fetchTeams() {
  return fetchJson<TeamSummary[]>('/teams');
}

export function fetchTeam(teamId: number) {
  return fetchJson<TeamSummary>(`/teams/${teamId}`);
}

export function fetchTeamGames(teamId: number, params?: PaginationParams & {
  season?: string;
  season_type?: string;
}) {
  return fetchJson<PaginatedResponse<TeamGameLog>>(`/teams/${teamId}/games`, params);
}

export function fetchTeamLineups(teamId: number, params?: PaginationParams & {
  season?: string;
  season_type?: string;
  min_minutes?: number;
}) {
  return fetchJson<PaginatedResponse<LineupStats>>(`/teams/${teamId}/lineups`, params);
}

// ── Games ───────────────────────────────────────────────────

export function fetchGame(gameId: string) {
  return fetchJson<GameSummary>(`/games/${gameId}`);
}

export function fetchGamePlayers(gameId: string) {
  return fetchJson<PlayerGameAdvanced[]>(`/games/${gameId}/players`);
}

export function fetchGameShots(gameId: string, params?: PaginationParams & {
  period?: number;
  team_id?: number;
}) {
  return fetchJson<PaginatedResponse<ShotChartItem>>(`/games/${gameId}/shots`, params);
}

export function fetchGamePbp(gameId: string, params?: PaginationParams & {
  period?: number;
}) {
  return fetchJson<PaginatedResponse<PlayByPlayEvent>>(`/games/${gameId}/pbp`, params);
}

// ── Leaderboards ────────────────────────────────────────────

export function fetchShotQualityLeaderboard(params?: PaginationParams & {
  season?: string;
  season_type?: string;
  team_id?: number;
  min_shots?: number;
  sort_by?: 'pax_per_100_shots' | 'total_points_above_expected' | 'shot_quality_score' | 'shot_making_score' | 'fg_pct' | 'total_shots';
}) {
  return fetchJson<PaginatedResponse<ShotQuality>>('/shot-quality', params);
}

export function fetchLineupLeaderboard(params?: PaginationParams & {
  season?: string;
  season_type?: string;
  team_id?: number;
  min_minutes?: number;
  sort_by?: 'total_minutes' | 'net_rating_per_100' | 'offensive_rating' | 'plus_minus' | 'points' | 'effective_fg_pct';
}) {
  return fetchJson<PaginatedResponse<LineupStats>>('/lineups', params);
}

// ── Standalone PBP & Rolling ────────────────────────────────

export function fetchPbp(params?: PaginationParams & {
  game_id?: string;
  period?: number;
  player_id?: number;
  team_id?: number;
}) {
  return fetchJson<PaginatedResponse<PlayByPlayEvent>>('/pbp', params);
}

export function fetchRolling(params?: PaginationParams & {
  player_id?: number;
  season?: string;
  season_type?: string;
  team_id?: number;
}) {
  return fetchJson<PaginatedResponse<PlayerRollingStats>>('/rolling', params);
}
