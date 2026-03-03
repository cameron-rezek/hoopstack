from pydantic import BaseModel
from datetime import date


class PlayerGameAdvanced(BaseModel):
    season_id: str
    player_id: int
    player_name: str
    team_id: int
    team_abbreviation: str
    team_name: str
    game_id: str
    game_date: date
    matchup: str
    win_loss: str
    home_away: str
    minutes_played: float | None = None
    points: int
    field_goals_made: int
    field_goals_attempted: int
    field_goal_pct: float | None = None
    three_pointers_made: int
    three_pointers_attempted: int
    three_point_pct: float | None = None
    free_throws_made: int
    free_throws_attempted: int
    free_throw_pct: float | None = None
    offensive_rebounds: int
    defensive_rebounds: int
    total_rebounds: int
    assists: int
    steals: int
    blocks: int
    turnovers: int
    personal_fouls: int
    plus_minus: int | None = None
    season_type: str
    true_shooting_pct: float | None = None
    effective_fg_pct: float | None = None
    usage_rate: float | None = None
    assist_pct: float | None = None
    turnover_pct: float | None = None
    offensive_rebound_pct: float | None = None
    defensive_rebound_pct: float | None = None
    game_score: float | None = None
    pace: float | None = None


class GameSummary(BaseModel):
    game_id: str
    game_date: date
    season_id: str
    season_type: str
    home_team_id: int
    home_team_abbreviation: str
    home_team_name: str
    home_points: int
    away_team_id: int
    away_team_abbreviation: str
    away_team_name: str
    away_points: int
