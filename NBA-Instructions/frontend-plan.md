# Hoopstack Frontend Implementation Plan

> **Self-contained guide for building the Next.js + D3.js frontend.**
> Take this file to a fresh Claude Code chat and execute phase by phase.

---

## Background

Hoopstack is an NBA analytics platform. The data pipeline (PostgreSQL → dbt) and FastAPI backend are complete. The API runs at `http://localhost:8000` with 20 GET-only endpoints serving player stats, shot charts, play-by-play, lineups, and rolling averages across 3 NBA seasons (2023-24, 2024-25, 2025-26).

**CORS is already configured** for `http://localhost:3000`.

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 15 (App Router) | React framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling (dark-first) |
| React Query (TanStack Query) | 5 | Server state / caching |
| D3.js | 7 | Shot chart SVG rendering |
| Recharts | 2 | Line/area charts |
| Lucide React | latest | Icons |
| clsx | latest | Conditional classnames |

### Install Command

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd frontend
npm install @tanstack/react-query d3 recharts lucide-react clsx
npm install -D @types/d3
```

---

## Project Structure (all files to create)

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (providers, sidebar, global styles)
│   │   ├── page.tsx                      # Home / landing page
│   │   ├── globals.css                   # Tailwind + custom CSS vars
│   │   ├── players/
│   │   │   ├── page.tsx                  # Player search / browse
│   │   │   └── [playerId]/
│   │   │       └── page.tsx              # Player profile (tabs: game log, shots, rolling)
│   │   ├── teams/
│   │   │   ├── page.tsx                  # Team list
│   │   │   └── [teamId]/
│   │   │       └── page.tsx              # Team detail (tabs: games, lineups)
│   │   ├── games/
│   │   │   └── [gameId]/
│   │   │       └── page.tsx              # Game detail (box score, shot chart, PBP)
│   │   └── leaderboards/
│   │       └── page.tsx                  # Shot quality + lineup leaderboards
│   │
│   ├── lib/
│   │   ├── api.ts                        # Typed fetch client for all 20 endpoints
│   │   ├── types.ts                      # TypeScript interfaces (mirrors API models)
│   │   ├── constants.ts                  # Court dimensions, color scales, config
│   │   ├── utils.ts                      # Formatters, parsers, helpers
│   │   └── hooks/
│   │       ├── use-players.ts            # React Query hooks: players
│   │       ├── use-teams.ts              # React Query hooks: teams
│   │       ├── use-games.ts              # React Query hooks: games
│   │       ├── use-shots.ts              # React Query hooks: shots
│   │       ├── use-stats.ts              # React Query hooks: rolling, lineups, shot-quality
│   │       └── use-seasons.ts            # React Query hooks: seasons
│   │
│   ├── components/
│   │   ├── providers.tsx                 # QueryClientProvider wrapper
│   │   ├── layout/
│   │   │   ├── sidebar.tsx               # Navigation sidebar
│   │   │   ├── header.tsx                # Top bar with season selector
│   │   │   └── season-selector.tsx       # Season dropdown (global context)
│   │   ├── ui/
│   │   │   ├── stat-card.tsx             # Single stat display box
│   │   │   ├── data-table.tsx            # Sortable, paginated table
│   │   │   ├── search-input.tsx          # Debounced search with typeahead
│   │   │   ├── loading-skeleton.tsx      # Skeleton placeholders
│   │   │   ├── empty-state.tsx           # "No data" display
│   │   │   ├── error-display.tsx         # Error boundary fallback
│   │   │   ├── pagination.tsx            # Page controls
│   │   │   ├── tabs.tsx                  # Tab navigation
│   │   │   └── sparkline.tsx             # Tiny inline chart
│   │   ├── players/
│   │   │   ├── player-card.tsx           # Search result card
│   │   │   ├── player-header.tsx         # Profile header (headshot, bio)
│   │   │   ├── game-log-table.tsx        # Player game log
│   │   │   └── player-search-results.tsx # Search result grid
│   │   ├── shots/
│   │   │   ├── court.tsx                 # D3 half-court SVG (the hero component)
│   │   │   ├── shot-scatter.tsx          # Scatter dots on court
│   │   │   ├── shot-hexbin.tsx           # Hexbin aggregation on court
│   │   │   ├── shot-zones.tsx            # Zone-based aggregation on court
│   │   │   ├── shot-chart-controls.tsx   # View toggle, filters
│   │   │   └── shot-tooltip.tsx          # Hover tooltip for shot details
│   │   ├── charts/
│   │   │   ├── rolling-line-chart.tsx    # Recharts multi-line for rolling stats
│   │   │   ├── game-flow-chart.tsx       # Score differential area chart (PBP)
│   │   │   ├── chart-theme.ts            # Recharts color/style config
│   │   │   └── stat-trend.tsx            # Stat with up/down arrow
│   │   ├── games/
│   │   │   ├── game-header.tsx           # Score banner (home vs away)
│   │   │   ├── box-score-table.tsx       # Player stats for both teams
│   │   │   └── pbp-feed.tsx             # Scrollable play-by-play timeline
│   │   └── leaderboards/
│   │       ├── shot-quality-table.tsx     # Shot quality rankings
│   │       └── lineup-table.tsx          # Lineup rankings
│   │
│   └── contexts/
│       └── season-context.tsx            # Global season state (React Context)
```

---

## Route Map

| Route | Page | Data Sources |
|-------|------|-------------|
| `/` | Home / landing | `/health`, `/seasons` |
| `/players` | Player search & browse | `/players?search=` |
| `/players/[playerId]` | Player profile | `/players/:id`, `/players/:id/games`, `/players/:id/shots`, `/players/:id/rolling`, `/players/:id/shot-quality` |
| `/teams` | Team list | `/teams` |
| `/teams/[teamId]` | Team detail | `/teams/:id`, `/teams/:id/games`, `/teams/:id/lineups` |
| `/games/[gameId]` | Game detail | `/games/:id`, `/games/:id/players`, `/games/:id/shots`, `/games/:id/pbp` |
| `/leaderboards` | Rankings | `/shot-quality`, `/lineups` |

---

## Design System

### Color Palette (dark theme)

```css
/* globals.css — add these CSS custom properties */
:root {
  --bg-primary: #0a0a0f;      /* Page background */
  --bg-card: #141419;          /* Card / panel background */
  --bg-elevated: #1c1c24;     /* Hover states, active tabs */
  --border: #2a2a35;           /* Borders, dividers */
  --text-primary: #e8e8ed;    /* Main text */
  --text-secondary: #8b8b9e;  /* Muted text */
  --accent: #6366f1;          /* Indigo — primary accent */
  --accent-hover: #818cf8;    /* Lighter indigo */
  --success: #22c55e;         /* Made shots, positive stats */
  --danger: #ef4444;          /* Missed shots, negative stats */
  --warning: #f59e0b;         /* Neutral / caution */
}
```

### Typography

- **Font**: System font stack (`font-sans` in Tailwind) or Inter via `next/font/google`
- **Headings**: `text-xl font-semibold text-[var(--text-primary)]`
- **Body**: `text-sm text-[var(--text-secondary)]`
- **Numbers/Stats**: `font-mono tabular-nums` for alignment

### Component Conventions

- All components use `className` prop for style overrides
- Cards: `bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4`
- Hover states: `hover:bg-[var(--bg-elevated)] transition-colors`
- Tables: striped rows with `even:bg-[var(--bg-elevated)]/50`

---

## TypeScript Interfaces

> These mirror the API Pydantic models exactly. Put in `src/lib/types.ts`.

```typescript
// ── Pagination ──────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

// ── Players ─────────────────────────────────────────────────

export interface PlayerSummary {
  player_id: number;
  player_name: string;
  position: string | null;
  team_id: number | null;
  team_name: string | null;
  team_abbreviation: string | null;
}

export interface PlayerDetail {
  player_id: number;
  player_name: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;       // ISO date string
  school: string | null;
  country: string | null;
  height: string | null;            // e.g. "6-6"
  weight: number | null;
  seasons_experience: number | null;
  jersey_number: string | null;
  position: string | null;
  team_id: number | null;
  team_name: string | null;
  team_abbreviation: string | null;
  career_start_year: number | null;
  career_end_year: number | null;
  draft_year: string | null;
  draft_round: string | null;
  draft_number: string | null;
}

// ── Teams ───────────────────────────────────────────────────

export interface TeamSummary {
  team_id: number;
  team_name: string;
  team_abbreviation: string;
  city: string | null;
  conference: string | null;
  division: string | null;
  arena_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
}

// ── Games ───────────────────────────────────────────────────

export interface GameSummary {
  game_id: string;
  game_date: string;                // ISO date string
  season_id: string;
  season_type: string;
  home_team_id: number;
  home_team_abbreviation: string;
  home_team_name: string;
  home_points: number;
  away_team_id: number;
  away_team_abbreviation: string;
  away_team_name: string;
  away_points: number;
}

// ── Player Game Advanced ────────────────────────────────────

export interface PlayerGameAdvanced {
  season_id: string;
  player_id: number;
  player_name: string;
  team_id: number;
  team_abbreviation: string;
  team_name: string;
  game_id: string;
  game_date: string;
  matchup: string;
  win_loss: string;
  home_away: string;
  minutes_played: number | null;
  points: number;
  field_goals_made: number;
  field_goals_attempted: number;
  field_goal_pct: number | null;
  three_pointers_made: number;
  three_pointers_attempted: number;
  three_point_pct: number | null;
  free_throws_made: number;
  free_throws_attempted: number;
  free_throw_pct: number | null;
  offensive_rebounds: number;
  defensive_rebounds: number;
  total_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personal_fouls: number;
  plus_minus: number | null;
  season_type: string;
  true_shooting_pct: number | null;
  effective_fg_pct: number | null;
  usage_rate: number | null;
  assist_pct: number | null;
  turnover_pct: number | null;
  offensive_rebound_pct: number | null;
  defensive_rebound_pct: number | null;
  game_score: number | null;
  pace: number | null;
}

// ── Team Game Log ───────────────────────────────────────────

export interface TeamGameLog {
  season_id: string;
  team_id: number;
  team_abbreviation: string;
  team_name: string;
  game_id: string;
  game_date: string;
  matchup: string;
  win_loss: string;
  home_away: string;
  minutes_played: number | null;
  points: number;
  field_goals_made: number;
  field_goals_attempted: number;
  field_goal_pct: number | null;
  three_pointers_made: number;
  three_pointers_attempted: number;
  three_point_pct: number | null;
  free_throws_made: number;
  free_throws_attempted: number;
  free_throw_pct: number | null;
  offensive_rebounds: number;
  defensive_rebounds: number;
  total_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personal_fouls: number;
  plus_minus: number | null;
  season_type: string;
}

// ── Shot Chart ──────────────────────────────────────────────

export interface ShotChartItem {
  game_id: string;
  game_event_id: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  period: number;
  minutes_remaining: number;
  seconds_remaining: number;
  event_type: string;
  action_type: string;
  shot_type: string;
  shot_zone_basic: string | null;
  shot_zone_area: string | null;
  shot_zone_range: string | null;
  shot_distance: number | null;
  loc_x: number | null;
  loc_y: number | null;
  distance_feet: number | null;
  shot_angle: number | null;
  is_made: boolean;
  shot_value: number;
  game_date: string | null;
  season: string;
  season_type: string;
}

// ── Shot Quality ────────────────────────────────────────────

export interface ShotQuality {
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  season: string;
  season_type: string;
  total_shots: number;
  total_makes: number;
  fg_pct: number | null;
  total_expected_points: number | null;
  total_actual_points: number | null;
  total_points_above_expected: number | null;
  pax_per_100_shots: number | null;
  shot_quality_score: number | null;
  shot_making_score: number | null;
}

// ── Lineup Stats ────────────────────────────────────────────

export interface LineupStats {
  group_id: string;
  group_name: string;
  team_id: number;
  team_abbreviation: string;
  games_played: number;
  wins: number;
  losses: number;
  win_pct: number | null;
  minutes_per_game: number | null;
  points: number | null;
  assists: number | null;
  total_rebounds: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  plus_minus: number | null;
  field_goal_pct: number | null;
  three_point_pct: number | null;
  free_throw_pct: number | null;
  effective_fg_pct: number | null;
  turnover_pct: number | null;
  offensive_rating: number | null;
  net_rating_per_100: number | null;
  total_minutes: number | null;
  sample_size_flag: string | null;
  season: string;
  season_type: string;
}

// ── Play-by-Play ────────────────────────────────────────────

export interface PlayByPlayEvent {
  game_id: string;
  action_number: number;
  clock: string | null;              // e.g. "PT11M22.00S" (ISO 8601 duration)
  period: number;
  team_id: number | null;
  team_tricode: string | null;
  player_id: number | null;
  player_name: string | null;
  player_name_i: string | null;
  x_legacy: number | null;
  y_legacy: number | null;
  shot_distance: number | null;
  shot_result: string | null;        // "Made" or "Missed"
  is_field_goal: boolean | null;
  score_home: string | null;
  score_away: string | null;
  score_differential: number | null;
  points_total: number | null;
  description: string | null;
  action_type: string | null;
  sub_type: string | null;
}

// ── Rolling Stats ───────────────────────────────────────────

export interface PlayerRollingStats {
  season_id: string;
  player_id: number;
  player_name: string;
  team_id: number;
  team_abbreviation: string;
  team_name: string;
  game_id: string;
  game_date: string;
  season_game_number: number;
  season_type: string;
  points: number;
  assists: number;
  total_rebounds: number;
  true_shooting_pct: number | null;
  usage_rate: number | null;
  plus_minus: number | null;
  game_score: number | null;
  // 5-game rolling
  points_avg_5g: number | null;
  assists_avg_5g: number | null;
  rebounds_avg_5g: number | null;
  ts_pct_avg_5g: number | null;
  usage_avg_5g: number | null;
  plus_minus_avg_5g: number | null;
  game_score_avg_5g: number | null;
  // 10-game rolling
  points_avg_10g: number | null;
  assists_avg_10g: number | null;
  rebounds_avg_10g: number | null;
  ts_pct_avg_10g: number | null;
  usage_avg_10g: number | null;
  plus_minus_avg_10g: number | null;
  game_score_avg_10g: number | null;
  // 20-game rolling
  points_avg_20g: number | null;
  assists_avg_20g: number | null;
  rebounds_avg_20g: number | null;
  ts_pct_avg_20g: number | null;
  usage_avg_20g: number | null;
  plus_minus_avg_20g: number | null;
  game_score_avg_20g: number | null;
  // Season averages
  points_avg_season: number | null;
  assists_avg_season: number | null;
  rebounds_avg_season: number | null;
  ts_pct_avg_season: number | null;
  usage_avg_season: number | null;
  plus_minus_avg_season: number | null;
  game_score_avg_season: number | null;
}
```

---

## API Client

> Put in `src/lib/api.ts`. Every endpoint gets a typed function.

```typescript
import type {
  PaginatedResponse, PaginationParams,
  PlayerSummary, PlayerDetail, PlayerGameAdvanced,
  ShotChartItem, ShotQuality, PlayerRollingStats,
  TeamSummary, TeamGameLog, LineupStats,
  GameSummary, PlayByPlayEvent,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Helpers ─────────────────────────────────────────────────

async function fetchJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  const res = await fetch(url.toString());
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
```

---

## Court Geometry Constants

> Put in `src/lib/constants.ts`. The NBA API `loc_x` / `loc_y` coordinates use a system where the basket is at (0, 0), X ranges from roughly -250 to 250 (tenths of a foot), and Y ranges from roughly -50 to 890.

```typescript
// ── Court dimensions (in API coordinate units = tenths of a foot) ──

export const COURT = {
  // SVG viewBox: we render half court
  WIDTH: 500,            // -250 to 250 in loc_x
  HEIGHT: 470,           // -50 to ~420 in loc_y (we clip above 3pt arc)

  // Offset: shift coordinates so basket is centered
  OFFSET_X: 250,         // loc_x + 250 → SVG x
  OFFSET_Y: 50,          // loc_y + 50  → SVG y

  // Court markings (all in coordinate units)
  BASKET_X: 250,         // center of SVG
  BASKET_Y: 50,          // 50px from top (after offset)
  BASKET_RADIUS: 7.5,
  BACKBOARD_WIDTH: 60,

  // Paint / key
  PAINT_WIDTH: 160,      // 16 ft = 160 units
  PAINT_HEIGHT: 190,     // 19 ft = 190 units
  FREE_THROW_RADIUS: 60, // 6 ft radius

  // Three-point line
  THREE_PT_RADIUS: 237.5, // 23.75 ft = 237.5 units
  THREE_PT_SIDE_Y: 140,   // corner 3 extends 14 ft from baseline
  THREE_PT_SIDE_X: 220,   // 22 ft from center at corners

  // Restricted area
  RESTRICTED_RADIUS: 40,  // 4 ft = 40 units
} as const;

// ── Shot chart color scales ─────────────────────────────────

// For scatter: simple make/miss
export const SHOT_COLORS = {
  made: '#22c55e',       // green
  missed: '#ef4444',     // red
} as const;

// For hexbin/zone: efficiency relative to league average
// Uses a diverging scale: below average → red, average → white, above → green
export const EFFICIENCY_SCALE = {
  domain: [-0.10, 0, 0.10],  // FG% difference from league avg
  range: ['#ef4444', '#6b7280', '#22c55e'],
} as const;

// ── Recharts theme ──────────────────────────────────────────

export const CHART_COLORS = [
  '#6366f1', // indigo (primary)
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
] as const;

export const CHART_THEME = {
  backgroundColor: 'transparent',
  textColor: '#8b8b9e',
  gridColor: '#2a2a35',
  tooltipBg: '#1c1c24',
  tooltipBorder: '#2a2a35',
  fontSize: 12,
} as const;

// ── NBA headshot CDN ────────────────────────────────────────

export function playerHeadshotUrl(playerId: number): string {
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
}

export function teamLogoUrl(teamId: number): string {
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
}

// ── Season helpers ──────────────────────────────────────────

export const DEFAULT_SEASON = '2024-25';
export const SEASON_TYPES = ['Regular Season', 'Playoffs'] as const;
```

---

## Utility Functions

> Put in `src/lib/utils.ts`.

```typescript
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format 0.567 → "56.7%" */
export function formatPct(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format 12.345 → "12.3" */
export function formatStat(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(decimals);
}

/** Format +/- with sign: 5 → "+5", -3 → "-3" */
export function formatPlusMinus(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value > 0 ? `+${value}` : `${value}`;
}

/** Parse PBP clock "PT11M22.00S" → "11:22" */
export function parsePbpClock(clock: string | null): string {
  if (!clock) return '';
  const match = clock.match(/PT(\d+)M([\d.]+)S/);
  if (!match) return clock;
  const minutes = match[1];
  const seconds = Math.floor(parseFloat(match[2])).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Format ISO date string → "Jan 15, 2025" */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Debounce helper for search input */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/**
 * Auto-paginate: fetch all pages from a paginated endpoint.
 * Use for shot charts where you need every shot on the court.
 */
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
```

---

## Phase 1: Project Scaffolding & Design System

**Goal**: Next.js app boots, dark theme works, layout shell renders, health check confirms API connection.

### Steps

1. **Scaffold the project**
   ```bash
   npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   cd frontend
   npm install @tanstack/react-query d3 recharts lucide-react clsx
   npm install -D @types/d3
   ```

2. **Create `frontend/.env.local`**
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Set up globals.css** — Add CSS custom properties from Design System section above. Set `body` background to `var(--bg-primary)`, text color to `var(--text-primary)`.

4. **Create `src/lib/types.ts`** — Paste the full TypeScript Interfaces section above.

5. **Create `src/lib/api.ts`** — Paste the full API Client section above.

6. **Create `src/lib/constants.ts`** — Paste the Court Geometry & Constants section above.

7. **Create `src/lib/utils.ts`** — Paste the Utility Functions section above.

8. **Create `src/components/providers.tsx`** — React Query `QueryClientProvider` wrapper. Configure `staleTime: 5 * 60 * 1000` (5 min), `retry: 1`.

9. **Create `src/contexts/season-context.tsx`** — React Context with `season` state (default `"2024-25"`) and `setSeason`. Fetch available seasons from `/seasons` on mount.

10. **Create layout components**:
    - `src/components/layout/sidebar.tsx` — Vertical nav: Home, Players, Teams, Leaderboards. Use `lucide-react` icons (`Home`, `Users`, `Shield`, `Trophy`). Active link highlighted with `var(--accent)`.
    - `src/components/layout/header.tsx` — Top bar showing "Hoopstack" title and season selector.
    - `src/components/layout/season-selector.tsx` — `<select>` dropdown bound to season context. Options from `/seasons` endpoint.

11. **Update `src/app/layout.tsx`** — Wrap children in `Providers` (React Query + Season Context). Render sidebar on the left (w-56), header on top, main content area with padding.

12. **Create `src/app/page.tsx`** (Home) — Fetch `/health`. Show status card with green dot when connected. Show table row counts. Simple "Welcome to Hoopstack" hero text.

### Demoable Outcome
App loads at `localhost:3000` with dark theme, sidebar navigation, season selector, and a health check card showing the API is connected with row counts.

---

## Phase 2: Player Search & Profile

**Goal**: Search for any player, view their profile with headshot, browse their game log.

### Steps

1. **Create React Query hooks** in `src/lib/hooks/use-players.ts`:
   - `usePlayers(params)` — wraps `fetchPlayers`
   - `usePlayer(playerId)` — wraps `fetchPlayer`
   - `usePlayerGames(playerId, params)` — wraps `fetchPlayerGames`
   Use season from context as default `season` param.

2. **Create `src/lib/hooks/use-seasons.ts`**:
   - `useSeasons()` — wraps `fetchSeasons`

3. **Create UI components**:
   - `src/components/ui/search-input.tsx` — Input with `Search` icon, 300ms debounce, `onChange` callback.
   - `src/components/ui/data-table.tsx` — Generic table: accepts `columns` config (header, accessor, format fn, sortable flag) and `data` array. Handles client-side column sorting. Styling: dark rows, hover highlight.
   - `src/components/ui/pagination.tsx` — Previous/Next buttons + page indicator. Accepts `page`, `totalPages`, `onPageChange`.
   - `src/components/ui/loading-skeleton.tsx` — Pulsing gray rectangles for loading states.
   - `src/components/ui/empty-state.tsx` — Centered icon + message for no results.
   - `src/components/ui/stat-card.tsx` — Label + large number + optional subtitle. For profile page stat highlights.
   - `src/components/ui/tabs.tsx` — Horizontal tab bar, controlled via state.

4. **Create `src/components/players/player-card.tsx`** — Card showing player name, team, position. Headshot thumbnail from `playerHeadshotUrl()`. Links to `/players/[playerId]`. Use `<Image>` with `unoptimized` prop (external CDN). Add `onError` handler to show a fallback silhouette — some player IDs don't have headshots on the CDN.

5. **Create `src/components/players/player-search-results.tsx`** — Grid of `PlayerCard` components with pagination.

6. **Build `/players` page** (`src/app/players/page.tsx`):
   - Search input at top
   - Debounced search updates `search` query param → `usePlayers({ search })`
   - Results as card grid (responsive: 1-2-3 columns)
   - Pagination at bottom

7. **Create `src/components/players/player-header.tsx`** — Large headshot, player name, team, jersey number, position, height/weight, draft info. Background gradient using team color if available.

8. **Create `src/components/players/game-log-table.tsx`** — Uses `DataTable` with columns: Date, Matchup, W/L, MIN, PTS, REB, AST, STL, BLK, TO, FG%, 3P%, FT%, +/-, TS%, Game Score. Date column links to `/games/[gameId]`.

9. **Build `/players/[playerId]` page** (`src/app/players/[playerId]/page.tsx`):
   - `usePlayer(playerId)` for header
   - Tabs: "Game Log" (default), "Shot Chart" (placeholder), "Rolling Stats" (placeholder)
   - Game Log tab shows `GameLogTable` with `usePlayerGames` hook + pagination
   - Season selector in header filters all tabs

### Demoable Outcome
Search "LeBron" → see player cards → click into profile → see headshot, bio, and scrollable game log table for the selected season.

---

## Phase 3: Shot Chart (Hero Feature)

**Goal**: Interactive D3 shot chart on the player profile page. Scatter, hexbin, and zone views.

### Steps

1. **Create `src/lib/hooks/use-shots.ts`**:
   - `usePlayerShots(playerId, params)` — wraps `fetchPlayerShots`
   - `useAllPlayerShots(playerId, params)` — uses `fetchAllPages` to get every shot for the selected season (needed for a complete chart). Cache aggressively (10 min staleTime).
   - `useGameShots(gameId, params)` — wraps `fetchGameShots`

2. **Create `src/components/shots/court.tsx`** — The core D3 half-court SVG:
   - Render as `<svg>` with `viewBox="0 0 500 470"` and `preserveAspectRatio`
   - Draw court lines using the `COURT` constants:
     - **Outer boundary** (rectangle)
     - **Paint / key** (rectangle centered at basket)
     - **Free throw circle** (full circle, dashed lower half)
     - **Basket** (small circle at BASKET_X, BASKET_Y)
     - **Backboard** (horizontal line above basket)
     - **Three-point arc** (arc from corner to corner, straight lines at corners)
     - **Restricted area arc** (semicircle around basket)
   - Court lines: `stroke="var(--border)"`, `fill="none"`, `strokeWidth={1}`
   - Accept `children` prop so shot layers can be composed inside
   - Component must be responsive: `width="100%" height="auto"`

   **Coordinate transform**: `loc_x` and `loc_y` from the API → SVG position:
   ```typescript
   const svgX = (loc_x ?? 0) + COURT.OFFSET_X;  // shift right
   const svgY = (loc_y ?? 0) + COURT.OFFSET_Y;   // shift down
   ```

3. **Create `src/components/shots/shot-scatter.tsx`**:
   - Renders shots as circles on the court
   - Made shots: `SHOT_COLORS.made` (green), small radius
   - Missed shots: `SHOT_COLORS.missed` (red), small X mark or hollow circle
   - Opacity: 0.6 so overlapping shots are visible
   - Hover: show tooltip with shot details

4. **Create `src/components/shots/shot-hexbin.tsx`**:
   - Use `d3-hexbin` to aggregate shots into hexagonal bins
   - Hex size = frequency (more shots → larger hex)
   - Hex color = efficiency (FG% vs league avg zone FG%) using `EFFICIENCY_SCALE`
   - Minimum 3 shots per bin to display

5. **Create `src/components/shots/shot-zones.tsx`**:
   - Aggregate shots by `shot_zone_basic` + `shot_zone_area` + `shot_zone_range`
   - Draw zone regions on court, colored by efficiency vs league average
   - Show FG% and attempt count as text in each zone

6. **Create `src/components/shots/shot-tooltip.tsx`**:
   - Positioned near cursor on hover
   - Shows: action_type, distance, make/miss, game date, period + time

7. **Create `src/components/shots/shot-chart-controls.tsx`**:
   - View toggle: Scatter | Hexbin | Zones (radio buttons)
   - Optional game filter dropdown
   - Shot type filter (2PT / 3PT / All)

8. **Wire up the Shot Chart tab** on the player profile page:
   - Use `useAllPlayerShots` to fetch all shots for the season
   - Show loading skeleton while fetching
   - Render `<Court>` with the selected view layer inside
   - Show shot summary stats below: total shots, FG%, 3P%, points

### Caveats

- **Coordinate system**: The NBA API's `loc_x`/`loc_y` coordinates place the basket at (0, 0). `loc_x` ranges roughly -250 to 250. `loc_y` ranges roughly -50 to 890+, but most shots are under 350. The SVG viewBox is set to clip at Y=470 (47 feet) which covers all realistic shots.
- **Auto-pagination**: A player may have 1000+ shots per season. The API paginates at max 100 per page. Use `fetchAllPages` to grab them all in parallel. Show a progress indicator or "Loading X shots..." message.
- **`d3-hexbin`**: Install separately if not included in d3 v7 bundle: `npm install d3-hexbin @types/d3-hexbin`.

### Demoable Outcome
Player profile → Shot Chart tab → see all season shots on an accurate half-court. Toggle between scatter (individual dots), hexbin (frequency/efficiency), and zone views. Hover for details.

---

## Phase 4: Rolling Stats & Trends

**Goal**: Recharts line charts showing how a player's stats trend over the season.

### Steps

1. **Create `src/lib/hooks/use-stats.ts`**:
   - `usePlayerRolling(playerId, params)` — wraps `fetchPlayerRolling`
   - `usePlayerShotQuality(playerId, params)` — wraps `fetchPlayerShotQuality`

2. **Create `src/components/charts/chart-theme.ts`** — Export Recharts-compatible theme config:
   ```typescript
   export const chartMargin = { top: 5, right: 20, bottom: 5, left: 0 };

   export const axisStyle = {
     tick: { fill: CHART_THEME.textColor, fontSize: CHART_THEME.fontSize },
     axisLine: { stroke: CHART_THEME.gridColor },
   };

   export const tooltipStyle = {
     contentStyle: {
       backgroundColor: CHART_THEME.tooltipBg,
       border: `1px solid ${CHART_THEME.tooltipBorder}`,
       borderRadius: '8px',
       color: '#e8e8ed',
       fontSize: 12,
     },
   };
   ```

3. **Create `src/components/charts/rolling-line-chart.tsx`**:
   - Recharts `<ResponsiveContainer>` + `<LineChart>`
   - X axis: `season_game_number` (game #)
   - Plot lines for selected stat: actual per-game value (faded dots) + 5g, 10g, 20g rolling averages (solid lines, different colors)
   - Season average as a dashed reference line
   - Custom tooltip showing all values at that game
   - Stat selector dropdown: Points, Assists, Rebounds, TS%, Usage Rate, Game Score, +/-

4. **Create `src/components/charts/stat-trend.tsx`**:
   - Small component: stat value + up/down/flat arrow comparing last 5g avg to season avg
   - Green arrow up if trending above season average, red down if below

5. **Create `src/components/ui/sparkline.tsx`**:
   - Tiny (80x24px) Recharts `<LineChart>` showing last 10-15 data points
   - No axes, no labels — just the line for inline use in tables/cards

6. **Wire up the Rolling Stats tab** on the player profile page:
   - `usePlayerRolling(playerId, { season })` — returns array sorted by game number
   - Stat selector at top
   - Large `RollingLineChart` in the center
   - Below: grid of `StatTrend` cards for key stats (PTS, AST, REB, TS%, USG, +/-)
   - Also show shot quality summary from `usePlayerShotQuality`

### Demoable Outcome
Player profile → Rolling Stats tab → see a line chart of points trending over the season with 5g/10g/20g rolling averages. Switch to TS% or Usage. See trend arrows showing if the player is hot or cold.

---

## Phase 5: Game Detail & Play-by-Play

**Goal**: Click into any game to see the box score, a two-team shot chart, and a play-by-play feed with game flow chart.

### Steps

1. **Create `src/lib/hooks/use-games.ts`**:
   - `useGame(gameId)` — wraps `fetchGame`
   - `useGamePlayers(gameId)` — wraps `fetchGamePlayers`
   - `useGameShots(gameId, params)` — wraps `fetchGameShots`
   - `useGamePbp(gameId, params)` — wraps `fetchGamePbp`

2. **Create `src/components/games/game-header.tsx`**:
   - Score banner: Away team logo + name + score | Home team logo + name + score
   - Date, season type below
   - Team logos from `teamLogoUrl()`. Add `onError` fallback showing team abbreviation text.

3. **Create `src/components/games/box-score-table.tsx`**:
   - Takes `PlayerGameAdvanced[]` and splits by team
   - Two tables (or one with team section headers)
   - Columns: Player (link to profile), MIN, PTS, REB, AST, STL, BLK, TO, FG, 3P, FT, +/-, TS%, GmSc
   - Sort by minutes descending by default
   - Team totals row at bottom of each section

4. **Create `src/components/games/pbp-feed.tsx`**:
   - Scrollable vertical timeline of play-by-play events
   - Each event: clock time (parsed from `PT11M22.00S`), period indicator, description, score
   - Color-code by team (use team tricode)
   - Period headers as section dividers
   - Optional period filter tabs (Q1, Q2, Q3, Q4, OT)

5. **Create `src/components/charts/game-flow-chart.tsx`**:
   - Recharts `<AreaChart>` showing score differential over the game
   - X axis: action_number (or derived game clock)
   - Y axis: `score_differential` (positive = home leading, negative = away)
   - Fill: green when home leads, red when away leads (use `<defs>` gradient split at 0)
   - Reference line at y=0
   - Period markers as vertical reference lines

6. **Build `/games/[gameId]` page** (`src/app/games/[gameId]/page.tsx`):
   - `useGame(gameId)` for header
   - Tabs: Box Score (default), Shot Chart, Game Flow, Play-by-Play
   - **Box Score tab**: `BoxScoreTable` with `useGamePlayers`
   - **Shot Chart tab**: `<Court>` with `<ShotScatter>`, shots colored by team instead of make/miss. Use `useAllPages` on `fetchGameShots` to get all shots.
   - **Game Flow tab**: `GameFlowChart` using PBP data (auto-paginate `fetchGamePbp`)
   - **PBP tab**: `PbpFeed` with pagination or infinite scroll

### Caveats

- **PBP clock format**: The `clock` field is ISO 8601 duration format `"PT11M22.00S"`. Use the `parsePbpClock()` utility to convert to `"11:22"`.
- **Score differential**: The `score_differential` field in PBP tracks running score difference. Positive = home leading. Not every PBP event has score data (only scoring plays update it), so you may need to forward-fill.
- **Game flow X axis**: Using `action_number` as X gives even spacing but doesn't reflect real time. This is acceptable for a game flow visualization.

### Demoable Outcome
Click a game from a player's game log → see score header, full box score for both teams, a shot chart with two team colors, a game flow area chart, and a scrollable PBP feed.

---

## Phase 6: Leaderboards, Teams & Home Polish

**Goal**: Complete remaining pages and polish the landing page.

### Steps

1. **Create `src/lib/hooks/use-teams.ts`**:
   - `useTeams()` — wraps `fetchTeams`
   - `useTeam(teamId)` — wraps `fetchTeam`
   - `useTeamGames(teamId, params)` — wraps `fetchTeamGames`
   - `useTeamLineups(teamId, params)` — wraps `fetchTeamLineups`

2. **Create `src/components/leaderboards/shot-quality-table.tsx`**:
   - `DataTable` showing shot quality leaders
   - Columns: Rank, Player (link), Team, Shots, FG%, PAX/100, Shot Quality Score, Shot Making Score
   - Sortable by clicking column headers (triggers API `sort_by` param)
   - Filter: min shots slider/input, team dropdown

3. **Create `src/components/leaderboards/lineup-table.tsx`**:
   - `DataTable` showing best lineups
   - Columns: Rank, Lineup (5 player names), Team, GP, MIN, Net Rtg, Off Rtg, +/-, eFG%
   - Sortable columns via API `sort_by`
   - Filter: min minutes, team dropdown

4. **Build `/leaderboards` page** (`src/app/leaderboards/page.tsx`):
   - Tabs: Shot Quality | Lineups
   - Season selector affects both
   - Each tab has its leaderboard table + filters + pagination

5. **Build `/teams` page** (`src/app/teams/page.tsx`):
   - Grid of team cards: logo, city, name, conference/division
   - Group by conference if data available (note: `dims.dim_teams` is empty, so conference/division from `raw.team_details` may be null — handle gracefully)
   - Click → `/teams/[teamId]`

6. **Build `/teams/[teamId]` page** (`src/app/teams/[teamId]/page.tsx`):
   - Team header: logo, name, arena
   - Tabs: Game Log | Lineups
   - Game Log tab: `DataTable` with `useTeamGames`, date links to `/games/[gameId]`
   - Lineups tab: `LineupTable` with `useTeamLineups`

7. **Polish home page** (`src/app/page.tsx`):
   - Hero section: "Hoopstack" title + tagline ("NBA analytics for the modern fan")
   - Quick stats cards: total players, total games, total shots (from `/health` row counts)
   - Featured section: top 5 shot quality leaders for current season (quick fetch from `/shot-quality?per_page=5`)
   - Quick search bar that navigates to `/players?search=`

8. **Add navigational links throughout**:
   - Player names everywhere link to `/players/[playerId]`
   - Team abbreviations link to `/teams/[teamId]`
   - Game dates / matchups link to `/games/[gameId]`
   - Sidebar active state tracks current route

### Demoable Outcome
Full app is navigable: home page with featured stats → search players → player profiles with shot charts and trends → click into games → box scores and PBP → leaderboards → team pages. Everything uses dark theme with consistent design.

---

## Known Caveats & Edge Cases

1. **Season ID formats**: The API accepts `"2024-25"` format everywhere. Internally, game logs store `season_id` as `"22024"` but the API handles conversion. Always pass `"2024-25"` from the frontend.

2. **Empty `dims.dim_teams`**: The dimension table is empty, so team conference/division/colors may be null. The API serves teams from `raw.team_details` which has basic info. Fallback gracefully — show "—" for missing fields.

3. **NBA CDN headshots**: `https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png` works for active players but returns 404 for some historical or lesser-known players. Always add an `onError` handler on `<Image>` to show a silhouette/initials fallback.

4. **NBA CDN logos**: `https://cdn.nba.com/logos/nba/{team_id}/global/L/logo.svg` — same concern, add fallback.

5. **PBP clock**: Format is ISO 8601 duration `"PT11M22.00S"`. Parse with regex, don't try `new Date()`.

6. **Shot chart coordinate system**: `loc_x` ranges ~-250 to 250, `loc_y` ranges ~-50 to 890. The SVG clips at Y=470 (covering the half-court). Shots beyond Y=470 (full-court heaves) will be off-screen — this is fine, they're rare and misleading on a half-court view.

7. **Auto-pagination for shots**: A player can have 800-1500 shots per season. At 100 per page, that's 8-15 parallel requests. Show a loading state. Consider caching aggressively (10 min staleTime).

8. **No authentication**: The API is read-only with no auth. No tokens or headers needed.

9. **CORS**: Already configured for `http://localhost:3000`. If you change the frontend port, update `CORS_ORIGINS` in `api/.env`.

10. **`d3-hexbin`**: May need separate install: `npm install d3-hexbin @types/d3-hexbin`.

---

## Quick Reference: All 20 API Endpoints

| # | Path | Paginated | Key Params |
|---|------|-----------|------------|
| 1 | `GET /health` | No | — |
| 2 | `GET /seasons` | No | — |
| 3 | `GET /players` | Yes | `search`, `team_id`, `position` |
| 4 | `GET /players/{id}` | No | — |
| 5 | `GET /players/{id}/games` | Yes | `season`, `season_type` |
| 6 | `GET /players/{id}/shots` | Yes | `season`, `season_type`, `game_id` |
| 7 | `GET /players/{id}/shot-quality` | No | `season`, `season_type` |
| 8 | `GET /players/{id}/rolling` | No | `season`, `season_type` |
| 9 | `GET /teams` | No | — |
| 10 | `GET /teams/{id}` | No | — |
| 11 | `GET /teams/{id}/games` | Yes | `season`, `season_type` |
| 12 | `GET /teams/{id}/lineups` | Yes | `season`, `season_type`, `min_minutes` |
| 13 | `GET /games/{id}` | No | — |
| 14 | `GET /games/{id}/players` | No | — |
| 15 | `GET /games/{id}/shots` | Yes | `period`, `team_id` |
| 16 | `GET /games/{id}/pbp` | Yes | `period` |
| 17 | `GET /shot-quality` | Yes | `season`, `team_id`, `min_shots`, `sort_by` |
| 18 | `GET /lineups` | Yes | `season`, `team_id`, `min_minutes`, `sort_by` |
| 19 | `GET /rolling` | Yes | `player_id`, `season`, `team_id` |
| 20 | `GET /pbp` | Yes | `game_id`, `period`, `player_id`, `team_id` |

**Pagination**: Default 25/page, max 100. Response: `{ data, total, page, per_page, total_pages }`.

**Sort options** (`sort_by`):
- Shot quality: `pax_per_100_shots`, `total_points_above_expected`, `shot_quality_score`, `shot_making_score`, `fg_pct`, `total_shots`
- Lineups: `total_minutes`, `net_rating_per_100`, `offensive_rating`, `plus_minus`, `points`, `effective_fg_pct`
