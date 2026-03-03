from pydantic import BaseModel


class LineupStats(BaseModel):
    group_id: str
    group_name: str
    team_id: int
    team_abbreviation: str
    games_played: int
    wins: int
    losses: int
    win_pct: float | None = None
    minutes_per_game: float | None = None
    points: float | None = None
    assists: float | None = None
    total_rebounds: float | None = None
    steals: float | None = None
    blocks: float | None = None
    turnovers: float | None = None
    plus_minus: float | None = None
    field_goal_pct: float | None = None
    three_point_pct: float | None = None
    free_throw_pct: float | None = None
    effective_fg_pct: float | None = None
    turnover_pct: float | None = None
    offensive_rating: float | None = None
    net_rating_per_100: float | None = None
    total_minutes: float | None = None
    sample_size_flag: str | None = None
    season: str
    season_type: str
