LIST_ROLLING = """
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
       usage_avg_season, plus_minus_avg_season, game_score_avg_season,
       COUNT(*) OVER() AS _total
  FROM analytics.agg_player_rolling_stats
 WHERE 1=1
   {filters}
 ORDER BY game_date DESC
 LIMIT $1 OFFSET $2
"""
