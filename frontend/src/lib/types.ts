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
  birth_date: string | null;
  school: string | null;
  country: string | null;
  height: string | null;
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
  game_date: string;
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
  clock: string | null;
  period: number;
  team_id: number | null;
  team_tricode: string | null;
  player_id: number | null;
  player_name: string | null;
  player_name_i: string | null;
  x_legacy: number | null;
  y_legacy: number | null;
  shot_distance: number | null;
  shot_result: string | null;
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
