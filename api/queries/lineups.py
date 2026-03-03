LIST_LINEUPS = """
SELECT group_id, group_name, team_id, team_abbreviation,
       games_played, wins, losses, win_pct, minutes_per_game,
       points, assists, total_rebounds, steals, blocks, turnovers, plus_minus,
       field_goal_pct, three_point_pct, free_throw_pct,
       effective_fg_pct, turnover_pct,
       offensive_rating, net_rating_per_100, total_minutes, sample_size_flag,
       season, season_type,
       COUNT(*) OVER() AS _total
  FROM analytics.agg_lineup_stats
 WHERE 1=1
   {filters}
 ORDER BY {sort_by} DESC
 LIMIT $1 OFFSET $2
"""
