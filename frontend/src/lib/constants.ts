// ── Court dimensions (in API coordinate units = tenths of a foot) ──

export const COURT = {
  WIDTH: 500,
  HEIGHT: 470,
  OFFSET_X: 250,
  OFFSET_Y: 50,
  BASKET_X: 250,
  BASKET_Y: 50,
  BASKET_RADIUS: 7.5,
  BACKBOARD_WIDTH: 60,
  PAINT_WIDTH: 160,
  PAINT_HEIGHT: 190,
  FREE_THROW_RADIUS: 60,
  THREE_PT_RADIUS: 237.5,
  THREE_PT_SIDE_Y: 140,
  THREE_PT_SIDE_X: 220,
  RESTRICTED_RADIUS: 40,
} as const;

// ── Shot chart color scales ─────────────────────────────────

export const SHOT_COLORS = {
  made: '#22c55e',
  missed: '#ef4444',
} as const;

export const EFFICIENCY_SCALE = {
  domain: [-0.10, 0, 0.10],
  range: ['#ef4444', '#6b7280', '#22c55e'],
} as const;

// ── Recharts theme ──────────────────────────────────────────

export const CHART_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
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
