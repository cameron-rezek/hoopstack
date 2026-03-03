-- Indexes to speed up API queries
-- Run once: psql -f scripts/add_api_indexes.sql

-- Raw tables (backing staging views)
CREATE INDEX IF NOT EXISTS idx_raw_shots_player_season ON raw.shot_chart_detail (player_id, season);
CREATE INDEX IF NOT EXISTS idx_raw_shots_game ON raw.shot_chart_detail (game_id);
CREATE INDEX IF NOT EXISTS idx_raw_pbp_game ON raw.play_by_play (game_id);

-- Analytics tables (materialized by dbt)
CREATE INDEX IF NOT EXISTS idx_fct_pga_player_season ON analytics.fct_player_game_advanced (player_id, season_id);
CREATE INDEX IF NOT EXISTS idx_fct_pga_game ON analytics.fct_player_game_advanced (game_id);
CREATE INDEX IF NOT EXISTS idx_rolling_player_season ON analytics.agg_player_rolling_stats (player_id, season_id);
CREATE INDEX IF NOT EXISTS idx_lineups_team_season ON analytics.agg_lineup_stats (team_id, season);
CREATE INDEX IF NOT EXISTS idx_shot_quality_player ON analytics.agg_shot_quality (player_id);
