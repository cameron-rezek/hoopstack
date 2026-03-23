SORT_MAP = {
    "name": "p.player_name",
    "ppg": "s.ppg DESC NULLS LAST",
    "rpg": "s.rpg DESC NULLS LAST",
    "apg": "s.apg DESC NULLS LAST",
    "team": "p.team_abbreviation NULLS LAST, p.player_name",
    "position": "p.position NULLS LAST, p.player_name",
    "gp": "s.gp DESC NULLS LAST",
    "fg_pct": "s.fg_pct DESC NULLS LAST",
    "mpg": "s.mpg DESC NULLS LAST",
    "spg": "s.spg DESC NULLS LAST",
    "bpg": "s.bpg DESC NULLS LAST",
}

LIST_PLAYERS = """
SELECT p.player_id, p.player_name, p.position, p.team_id, p.team_name, p.team_abbreviation,
       s.ppg, s.rpg, s.apg, s.gp, s.fg_pct, s.mpg, s.spg, s.bpg, s.topg,
       COUNT(*) OVER() AS _total
  FROM staging.stg_players p
  LEFT JOIN (
    SELECT player_id,
           COUNT(*) AS gp,
           ROUND(AVG(points)::numeric, 1) AS ppg,
           ROUND(AVG(total_rebounds)::numeric, 1) AS rpg,
           ROUND(AVG(assists)::numeric, 1) AS apg,
           ROUND(AVG(field_goal_pct)::numeric, 1) AS fg_pct,
           ROUND(AVG(minutes_played)::numeric, 1) AS mpg,
           ROUND(AVG(steals)::numeric, 1) AS spg,
           ROUND(AVG(blocks)::numeric, 1) AS bpg,
           ROUND(AVG(turnovers)::numeric, 1) AS topg
      FROM analytics.fct_player_game_advanced
     WHERE season_type = 'Regular Season'
       AND season_id LIKE '%' || {season_param}
     GROUP BY player_id
     {having}
  ) s ON p.player_id = s.player_id
 WHERE 1=1
   {filters}
 ORDER BY {sort}
 LIMIT $1 OFFSET $2
"""

GET_PLAYER = """
SELECT player_id, player_name, first_name, last_name, birth_date,
       school, country, height, weight, seasons_experience,
       jersey_number, position, team_id, team_name, team_abbreviation,
       career_start_year, career_end_year,
       draft_year, draft_round, draft_number
  FROM staging.stg_players
 WHERE player_id = $1
"""

PLAYER_GAMES = """
SELECT season_id, player_id, player_name, team_id, team_abbreviation, team_name,
       game_id, game_date, matchup, win_loss, home_away,
       minutes_played, points, field_goals_made, field_goals_attempted, field_goal_pct,
       three_pointers_made, three_pointers_attempted, three_point_pct,
       free_throws_made, free_throws_attempted, free_throw_pct,
       offensive_rebounds, defensive_rebounds, total_rebounds,
       assists, steals, blocks, turnovers, personal_fouls, plus_minus,
       season_type,
       true_shooting_pct, effective_fg_pct, usage_rate, assist_pct,
       turnover_pct, offensive_rebound_pct, defensive_rebound_pct,
       game_score, pace,
       COUNT(*) OVER() AS _total
  FROM analytics.fct_player_game_advanced
 WHERE player_id = $1
   {filters}
 ORDER BY game_date DESC
 LIMIT $2 OFFSET $3
"""

PLAYER_SHOTS = """
SELECT game_id, game_event_id, player_id, player_name, team_id, team_name,
       period, minutes_remaining, seconds_remaining,
       event_type, action_type, shot_type,
       shot_zone_basic, shot_zone_area, shot_zone_range,
       shot_distance, loc_x, loc_y, distance_feet, shot_angle,
       is_made, shot_value, game_date, season, season_type,
       COUNT(*) OVER() AS _total
  FROM staging.stg_shot_charts
 WHERE player_id = $1
   {filters}
 ORDER BY game_date DESC, period, minutes_remaining DESC, seconds_remaining DESC
 LIMIT $2 OFFSET $3
"""

PLAYER_SHOT_QUALITY = """
SELECT player_id, player_name, team_id, team_name, season, season_type,
       total_shots, total_makes, fg_pct,
       total_expected_points, total_actual_points, total_points_above_expected,
       pax_per_100_shots, shot_quality_score, shot_making_score
  FROM analytics.agg_shot_quality
 WHERE player_id = $1
   {filters}
 ORDER BY season DESC
"""

PLAYER_ROLLING = """
SELECT season_id, player_id, player_name, team_id, team_abbreviation, team_name,
       game_id, game_date, season_game_number, season_type,
       points, assists, total_rebounds, true_shooting_pct, usage_rate, plus_minus, game_score,
       points_avg_5g, assists_avg_5g, rebounds_avg_5g, ts_pct_avg_5g,
       usage_avg_5g, plus_minus_avg_5g, game_score_avg_5g,
       points_avg_10g, assists_avg_10g, rebounds_avg_10g, ts_pct_avg_10g,
       usage_avg_10g, plus_minus_avg_10g, game_score_avg_10g,
       points_avg_20g, assists_avg_20g, rebounds_avg_20g, ts_pct_avg_20g,
       usage_avg_20g, plus_minus_avg_20g, game_score_avg_20g,
       points_avg_season, assists_avg_season, rebounds_avg_season, ts_pct_avg_season,
       usage_avg_season, plus_minus_avg_season, game_score_avg_season
  FROM analytics.agg_player_rolling_stats
 WHERE player_id = $1
   {filters}
 ORDER BY game_date
"""
