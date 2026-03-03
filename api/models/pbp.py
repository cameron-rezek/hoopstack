from pydantic import BaseModel


class PlayByPlayEvent(BaseModel):
    game_id: str
    action_number: int
    clock: str | None = None
    period: int
    team_id: int | None = None
    team_tricode: str | None = None
    player_id: int | None = None
    player_name: str | None = None
    player_name_i: str | None = None
    x_legacy: float | None = None
    y_legacy: float | None = None
    shot_distance: int | None = None
    shot_result: str | None = None
    is_field_goal: bool | None = None
    score_home: str | None = None
    score_away: str | None = None
    score_differential: int | None = None
    points_total: int | None = None
    description: str | None = None
    action_type: str | None = None
    sub_type: str | None = None
