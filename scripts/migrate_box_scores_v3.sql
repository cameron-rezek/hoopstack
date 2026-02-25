-- Migrate raw box score tables from V2 to V3 column schemas.
-- V2 endpoints are deprecated by the NBA API as of the 2025-26 season.
-- Tables currently have 0 rows, so this is safe to run.
--
-- Run with:
--   psql "host=192.168.1.22 port=5434 dbname=nba_analytics user=nba_admin password=ElephantLoopy!!84" \
--     -f scripts/migrate_box_scores_v3.sql

BEGIN;

-- ============================================================
-- raw.box_score_traditional (player-level)
-- V3 columns: camelCase → snake_case
-- Key change: player_id → person_id, FGM → field_goals_made, etc.
-- ============================================================
DROP TABLE IF EXISTS raw.box_score_traditional;
CREATE TABLE raw.box_score_traditional (
    id BIGSERIAL PRIMARY KEY,
    game_id VARCHAR(10) NOT NULL,
    team_id INTEGER,
    team_city VARCHAR(50),
    team_name VARCHAR(50),
    team_tricode VARCHAR(5),
    team_slug VARCHAR(50),
    person_id INTEGER NOT NULL,
    first_name VARCHAR(50),
    family_name VARCHAR(50),
    name_i VARCHAR(20),
    player_slug VARCHAR(100),
    position VARCHAR(10),
    comment VARCHAR(200),
    jersey_num VARCHAR(10),
    minutes VARCHAR(20),
    field_goals_made INTEGER,
    field_goals_attempted INTEGER,
    field_goals_percentage FLOAT,
    three_pointers_made INTEGER,
    three_pointers_attempted INTEGER,
    three_pointers_percentage FLOAT,
    free_throws_made INTEGER,
    free_throws_attempted INTEGER,
    free_throws_percentage FLOAT,
    rebounds_offensive INTEGER,
    rebounds_defensive INTEGER,
    rebounds_total INTEGER,
    assists INTEGER,
    steals INTEGER,
    blocks INTEGER,
    turnovers INTEGER,
    fouls_personal INTEGER,
    points INTEGER,
    plus_minus_points FLOAT,
    ingested_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'nba_api',
    UNIQUE (game_id, person_id)
);

-- ============================================================
-- raw.box_score_team_traditional (team-level totals)
-- ============================================================
DROP TABLE IF EXISTS raw.box_score_team_traditional;
CREATE TABLE raw.box_score_team_traditional (
    id BIGSERIAL PRIMARY KEY,
    game_id VARCHAR(10) NOT NULL,
    team_id INTEGER NOT NULL,
    team_city VARCHAR(50),
    team_name VARCHAR(50),
    team_tricode VARCHAR(5),
    team_slug VARCHAR(50),
    minutes VARCHAR(20),
    field_goals_made INTEGER,
    field_goals_attempted INTEGER,
    field_goals_percentage FLOAT,
    three_pointers_made INTEGER,
    three_pointers_attempted INTEGER,
    three_pointers_percentage FLOAT,
    free_throws_made INTEGER,
    free_throws_attempted INTEGER,
    free_throws_percentage FLOAT,
    rebounds_offensive INTEGER,
    rebounds_defensive INTEGER,
    rebounds_total INTEGER,
    assists INTEGER,
    steals INTEGER,
    blocks INTEGER,
    turnovers INTEGER,
    fouls_personal INTEGER,
    points INTEGER,
    plus_minus_points FLOAT,
    ingested_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'nba_api',
    UNIQUE (game_id, team_id)
);

-- ============================================================
-- raw.box_score_advanced (player-level)
-- V3 adds estimated metrics alongside actual metrics
-- ============================================================
DROP TABLE IF EXISTS raw.box_score_advanced;
CREATE TABLE raw.box_score_advanced (
    id BIGSERIAL PRIMARY KEY,
    game_id VARCHAR(10) NOT NULL,
    team_id INTEGER,
    team_city VARCHAR(50),
    team_name VARCHAR(50),
    team_tricode VARCHAR(5),
    team_slug VARCHAR(50),
    person_id INTEGER NOT NULL,
    first_name VARCHAR(50),
    family_name VARCHAR(50),
    name_i VARCHAR(20),
    player_slug VARCHAR(100),
    position VARCHAR(10),
    comment VARCHAR(200),
    jersey_num VARCHAR(10),
    minutes VARCHAR(20),
    estimated_offensive_rating FLOAT,
    offensive_rating FLOAT,
    estimated_defensive_rating FLOAT,
    defensive_rating FLOAT,
    estimated_net_rating FLOAT,
    net_rating FLOAT,
    assist_percentage FLOAT,
    assist_to_turnover FLOAT,
    assist_ratio FLOAT,
    offensive_rebound_percentage FLOAT,
    defensive_rebound_percentage FLOAT,
    rebound_percentage FLOAT,
    turnover_ratio FLOAT,
    effective_field_goal_percentage FLOAT,
    true_shooting_percentage FLOAT,
    usage_percentage FLOAT,
    estimated_usage_percentage FLOAT,
    estimated_pace FLOAT,
    pace FLOAT,
    pace_per40 FLOAT,
    possessions FLOAT,
    pie FLOAT,
    ingested_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'nba_api',
    UNIQUE (game_id, person_id)
);

-- ============================================================
-- raw.box_score_misc (player-level)
-- Second chance pts, fast break pts, paint pts, etc.
-- ============================================================
DROP TABLE IF EXISTS raw.box_score_misc;
CREATE TABLE raw.box_score_misc (
    id BIGSERIAL PRIMARY KEY,
    game_id VARCHAR(10) NOT NULL,
    team_id INTEGER,
    team_city VARCHAR(50),
    team_name VARCHAR(50),
    team_tricode VARCHAR(5),
    team_slug VARCHAR(50),
    person_id INTEGER NOT NULL,
    first_name VARCHAR(50),
    family_name VARCHAR(50),
    name_i VARCHAR(20),
    player_slug VARCHAR(100),
    position VARCHAR(10),
    comment VARCHAR(200),
    jersey_num VARCHAR(10),
    minutes VARCHAR(20),
    points_off_turnovers INTEGER,
    points_second_chance INTEGER,
    points_fast_break INTEGER,
    points_paint INTEGER,
    opp_points_off_turnovers INTEGER,
    opp_points_second_chance INTEGER,
    opp_points_fast_break INTEGER,
    opp_points_paint INTEGER,
    blocks INTEGER,
    blocks_against INTEGER,
    fouls_personal INTEGER,
    fouls_drawn INTEGER,
    ingested_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'nba_api',
    UNIQUE (game_id, person_id)
);

COMMIT;
