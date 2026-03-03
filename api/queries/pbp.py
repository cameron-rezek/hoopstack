LIST_PBP = """
SELECT game_id, action_number, clock, period,
       team_id, team_tricode, player_id, player_name, player_name_i,
       x_legacy, y_legacy, shot_distance, shot_result,
       is_field_goal, score_home, score_away, score_differential,
       points_total, description, action_type, sub_type,
       COUNT(*) OVER() AS _total
  FROM staging.stg_play_by_play
 WHERE 1=1
   {filters}
 ORDER BY game_id DESC, period, action_number
 LIMIT $1 OFFSET $2
"""
