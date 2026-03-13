import math

from fastapi import APIRouter, Depends, Query
import asyncpg

from api.dependencies import db_pool, Pagination
from api.exceptions import NotFoundError
from api.models.common import PaginatedResponse
from api.models.players import PlayerSummary, PlayerDetail
from api.models.games import PlayerGameAdvanced
from api.models.shots import ShotChartItem, ShotQuality
from api.models.rolling import PlayerRollingStats
from api.queries import players as sql

router = APIRouter(prefix="/players", tags=["Players"])


def _season_to_year(season: str) -> str:
    """Convert '2024-25' to '2024' for season_id LIKE matching."""
    return season.split("-")[0]


@router.get("", summary="List players", response_model=PaginatedResponse[PlayerSummary])
async def list_players(
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    search: str | None = Query(None, description="Search by player name"),
    team_id: int | None = Query(None),
    position: str | None = Query(None),
    sort_by: str | None = Query(None, description="Sort by: name, ppg, rpg, apg, team, position"),
):
    filters: list[str] = []
    params: list = [pag.per_page, pag.offset]
    next_idx = 3

    if search:
        filters.append(f"p.player_name ILIKE ${next_idx}")
        params.append(f"%{search}%")
        next_idx += 1
    if team_id is not None:
        filters.append(f"p.team_id = ${next_idx}")
        params.append(team_id)
        next_idx += 1
    if position:
        filters.append(f"p.position ILIKE ${next_idx}")
        params.append(f"%{position}%")
        next_idx += 1

    sort_col = sql.SORT_MAP.get(sort_by, "p.player_name")
    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.LIST_PLAYERS.format(filters=filter_sql, sort=sort_col)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [PlayerSummary(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )


@router.get("/{player_id}", summary="Get player details", response_model=PlayerDetail)
async def get_player(player_id: int, pool: asyncpg.Pool = Depends(db_pool)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql.GET_PLAYER, player_id)
    if not row:
        raise NotFoundError("Player", player_id)
    return PlayerDetail(**dict(row))


@router.get("/{player_id}/games", summary="Player game log", response_model=PaginatedResponse[PlayerGameAdvanced])
async def player_games(
    player_id: int,
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    season: str | None = Query(None, description="e.g. 2024-25"),
    season_type: str | None = Query(None),
):
    filters: list[str] = []
    params: list = [player_id, pag.per_page, pag.offset]
    next_idx = 4

    if season:
        filters.append(f"season_id LIKE '%' || ${next_idx}")
        params.append(_season_to_year(season))
        next_idx += 1
    if season_type:
        filters.append(f"season_type = ${next_idx}")
        params.append(season_type)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.PLAYER_GAMES.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [PlayerGameAdvanced(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )


@router.get("/{player_id}/shots", summary="Player shot chart", response_model=PaginatedResponse[ShotChartItem])
async def player_shots(
    player_id: int,
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    season: str | None = Query(None),
    season_type: str | None = Query(None),
    game_id: str | None = Query(None),
):
    filters: list[str] = []
    params: list = [player_id, pag.per_page, pag.offset]
    next_idx = 4

    if season:
        filters.append(f"season = ${next_idx}")
        params.append(season)
        next_idx += 1
    if season_type:
        filters.append(f"season_type = ${next_idx}")
        params.append(season_type)
        next_idx += 1
    if game_id:
        filters.append(f"game_id = ${next_idx}")
        params.append(game_id)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.PLAYER_SHOTS.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [ShotChartItem(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )


@router.get("/{player_id}/shot-quality", summary="Player shot quality by season", response_model=list[ShotQuality])
async def player_shot_quality(
    player_id: int,
    pool: asyncpg.Pool = Depends(db_pool),
    season: str | None = Query(None),
    season_type: str | None = Query(None),
):
    filters: list[str] = []
    params: list = [player_id]
    next_idx = 2

    if season:
        filters.append(f"season = ${next_idx}")
        params.append(season)
        next_idx += 1
    if season_type:
        filters.append(f"season_type = ${next_idx}")
        params.append(season_type)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.PLAYER_SHOT_QUALITY.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    return [ShotQuality(**dict(r)) for r in rows]


@router.get("/{player_id}/rolling", summary="Player rolling averages", response_model=list[PlayerRollingStats])
async def player_rolling(
    player_id: int,
    pool: asyncpg.Pool = Depends(db_pool),
    season: str | None = Query(None, description="e.g. 2024-25"),
    season_type: str | None = Query(None),
):
    filters: list[str] = []
    params: list = [player_id]
    next_idx = 2

    if season:
        filters.append(f"season_id LIKE '%' || ${next_idx}")
        params.append(_season_to_year(season))
        next_idx += 1
    if season_type:
        filters.append(f"season_type = ${next_idx}")
        params.append(season_type)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.PLAYER_ROLLING.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    return [PlayerRollingStats(**dict(r)) for r in rows]
