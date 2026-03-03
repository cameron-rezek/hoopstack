LIST_TEAMS = """
SELECT team_id,
       nickname AS team_name,
       abbreviation AS team_abbreviation,
       city,
       arena AS arena_name
  FROM raw.team_details
 ORDER BY nickname
"""

GET_TEAM = """
SELECT team_id,
       nickname AS team_name,
       abbreviation AS team_abbreviation,
       city,
       arena AS arena_name
  FROM raw.team_details
 WHERE team_id = $1
"""

TEAM_GAMES = """
SELECT season_id, team_id, team_abbreviation, team_name,
       game_id, game_date, matchup, win_loss, home_away,
       minutes_played, points, field_goals_made, field_goals_attempted, field_goal_pct,
       three_pointers_made, three_pointers_attempted, three_point_pct,
       free_throws_made, free_throws_attempted, free_throw_pct,
       offensive_rebounds, defensive_rebounds, total_rebounds,
       assists, steals, blocks, turnovers, personal_fouls, plus_minus,
       season_type,
       COUNT(*) OVER() AS _total
  FROM staging.stg_team_game_logs
 WHERE team_id = $1
   {filters}
 ORDER BY game_date DESC
 LIMIT $2 OFFSET $3
"""

TEAM_LINEUPS = """
SELECT group_id, group_name, team_id, team_abbreviation,
       games_played, wins, losses, win_pct, minutes_per_game,
       points, assists, total_rebounds, steals, blocks, turnovers, plus_minus,
       field_goal_pct, three_point_pct, free_throw_pct,
       effective_fg_pct, turnover_pct,
       offensive_rating, net_rating_per_100, total_minutes, sample_size_flag,
       season, season_type,
       COUNT(*) OVER() AS _total
  FROM analytics.agg_lineup_stats
 WHERE team_id = $1
   {filters}
 ORDER BY total_minutes DESC
 LIMIT $2 OFFSET $3
"""
