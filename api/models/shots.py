from datetime import date

from pydantic import BaseModel


class ShotChartItem(BaseModel):
    game_id: str
    game_event_id: int
    player_id: int
    player_name: str
    team_id: int
    team_name: str
    period: int
    minutes_remaining: int
    seconds_remaining: int
    event_type: str
    action_type: str
    shot_type: str
    shot_zone_basic: str | None = None
    shot_zone_area: str | None = None
    shot_zone_range: str | None = None
    shot_distance: int | None = None
    loc_x: int | None = None
    loc_y: int | None = None
    distance_feet: float | None = None
    shot_angle: float | None = None
    is_made: bool
    shot_value: int
    game_date: date | None = None
    season: str
    season_type: str


class ShotQuality(BaseModel):
    player_id: int
    player_name: str
    team_id: int
    team_name: str
    season: str
    season_type: str
    total_shots: int
    total_makes: int
    fg_pct: float | None = None
    total_expected_points: float | None = None
    total_actual_points: float | None = None
    total_points_above_expected: float | None = None
    pax_per_100_shots: float | None = None
    shot_quality_score: float | None = None
    shot_making_score: float | None = None
