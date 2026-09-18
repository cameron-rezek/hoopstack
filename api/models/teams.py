from datetime import date

from pydantic import BaseModel


class TeamSummary(BaseModel):
    team_id: int
    team_name: str
    team_abbreviation: str
    city: str | None = None
    conference: str | None = None
    division: str | None = None
    arena_name: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    logo_url: str | None = None


class TeamGameLog(BaseModel):
    season_id: str
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
