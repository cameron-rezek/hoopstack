GET_GAME = """
SELECT h.game_id, h.game_date, h.season_id, h.season_type,
       h.team_id AS home_team_id, h.team_abbreviation AS home_team_abbreviation,
       h.team_name AS home_team_name, h.points AS home_points,
       a.team_id AS away_team_id, a.team_abbreviation AS away_team_abbreviation,
       a.team_name AS away_team_name, a.points AS away_points
  FROM staging.stg_team_game_logs h
  JOIN staging.stg_team_game_logs a ON h.game_id = a.game_id AND a.home_away = 'away'
 WHERE h.game_id = $1
   AND h.home_away = 'home'
"""

GAME_PLAYERS = """
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
       game_score, pace
  FROM analytics.fct_player_game_advanced
 WHERE game_id = $1
 ORDER BY team_id, minutes_played DESC
"""

GAME_SHOTS = """
SELECT game_id, game_event_id, player_id, player_name, team_id, team_name,
       period, minutes_remaining, seconds_remaining,
       event_type, action_type, shot_type,
       shot_zone_basic, shot_zone_area, shot_zone_range,
       shot_distance, loc_x, loc_y, distance_feet, shot_angle,
       is_made, shot_value, game_date, season, season_type,
       COUNT(*) OVER() AS _total
  FROM staging.stg_shot_charts
 WHERE game_id = $1
   {filters}
 ORDER BY period, minutes_remaining DESC, seconds_remaining DESC
 LIMIT $2 OFFSET $3
"""

GAME_PBP = """
SELECT game_id, action_number, clock, period,
       team_id, team_tricode, player_id, player_name, player_name_i,
       x_legacy, y_legacy, shot_distance, shot_result,
       is_field_goal, score_home, score_away, score_differential,
       points_total, description, action_type, sub_type,
       COUNT(*) OVER() AS _total
  FROM staging.stg_play_by_play
 WHERE game_id = $1
   {filters}
 ORDER BY period, action_number
 LIMIT $2 OFFSET $3
"""
