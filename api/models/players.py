from pydantic import BaseModel
from datetime import date


class PlayerSummary(BaseModel):
    player_id: int
    player_name: str
    position: str | None = None
    team_id: int | None = None
    team_name: str | None = None
    team_abbreviation: str | None = None


class PlayerDetail(BaseModel):
    player_id: int
    player_name: str
    first_name: str | None = None
    last_name: str | None = None
    birth_date: date | None = None
    school: str | None = None
    country: str | None = None
    height: str | None = None
    weight: int | None = None
    seasons_experience: int | None = None
    jersey_number: str | None = None
    position: str | None = None
    team_id: int | None = None
    team_name: str | None = None
    team_abbreviation: str | None = None
    career_start_year: int | None = None
    career_end_year: int | None = None
    draft_year: str | None = None
    draft_round: str | None = None
    draft_number: str | None = None
