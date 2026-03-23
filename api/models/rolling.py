from pydantic import BaseModel
from datetime import date


class PlayerRollingStats(BaseModel):
    season_id: str
    player_id: int
    player_name: str
    team_id: int
    team_abbreviation: str
    team_name: str
    game_id: str
    game_date: date
    season_game_number: int
    season_type: str
    points: int
    assists: int
    total_rebounds: int
    true_shooting_pct: float | None = None
    effective_fg_pct: float | None = None
    usage_rate: float | None = None
    assist_pct: float | None = None
    turnover_pct: float | None = None
    offensive_rebound_pct: float | None = None
    defensive_rebound_pct: float | None = None
    plus_minus: int | None = None
    game_score: float | None = None
    points_avg_5g: float | None = None
    assists_avg_5g: float | None = None
    rebounds_avg_5g: float | None = None
    ts_pct_avg_5g: float | None = None
    efg_pct_avg_5g: float | None = None
    usage_avg_5g: float | None = None
    assist_pct_avg_5g: float | None = None
    turnover_pct_avg_5g: float | None = None
    oreb_pct_avg_5g: float | None = None
    dreb_pct_avg_5g: float | None = None
    plus_minus_avg_5g: float | None = None
    game_score_avg_5g: float | None = None
    points_avg_10g: float | None = None
    assists_avg_10g: float | None = None
    rebounds_avg_10g: float | None = None
    ts_pct_avg_10g: float | None = None
    efg_pct_avg_10g: float | None = None
    usage_avg_10g: float | None = None
    assist_pct_avg_10g: float | None = None
    turnover_pct_avg_10g: float | None = None
    oreb_pct_avg_10g: float | None = None
    dreb_pct_avg_10g: float | None = None
    plus_minus_avg_10g: float | None = None
    game_score_avg_10g: float | None = None
    points_avg_20g: float | None = None
    assists_avg_20g: float | None = None
    rebounds_avg_20g: float | None = None
    ts_pct_avg_20g: float | None = None
    efg_pct_avg_20g: float | None = None
    usage_avg_20g: float | None = None
    assist_pct_avg_20g: float | None = None
    turnover_pct_avg_20g: float | None = None
    oreb_pct_avg_20g: float | None = None
    dreb_pct_avg_20g: float | None = None
    plus_minus_avg_20g: float | None = None
    game_score_avg_20g: float | None = None
    points_avg_season: float | None = None
    assists_avg_season: float | None = None
    rebounds_avg_season: float | None = None
    ts_pct_avg_season: float | None = None
    efg_pct_avg_season: float | None = None
    usage_avg_season: float | None = None
    assist_pct_avg_season: float | None = None
    turnover_pct_avg_season: float | None = None
    oreb_pct_avg_season: float | None = None
    dreb_pct_avg_season: float | None = None
    plus_minus_avg_season: float | None = None
    game_score_avg_season: float | None = None
