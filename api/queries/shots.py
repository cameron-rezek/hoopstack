SHOT_QUALITY_LEADERBOARD = """
SELECT player_id, player_name, team_id, team_name, season, season_type,
       total_shots, total_makes, fg_pct,
       total_expected_points, total_actual_points, total_points_above_expected,
       pax_per_100_shots, shot_quality_score, shot_making_score,
       COUNT(*) OVER() AS _total
  FROM analytics.agg_shot_quality
 WHERE 1=1
   {filters}
 ORDER BY {sort_by} DESC
 LIMIT $1 OFFSET $2
"""
