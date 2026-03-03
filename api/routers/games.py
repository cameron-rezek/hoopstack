import math

from fastapi import APIRouter, Depends, Query
import asyncpg

from api.dependencies import db_pool, Pagination
from api.exceptions import NotFoundError
from api.models.common import PaginatedResponse
from api.models.games import GameSummary, PlayerGameAdvanced
from api.models.shots import ShotChartItem
from api.models.pbp import PlayByPlayEvent
from api.queries import games as sql

router = APIRouter(prefix="/games", tags=["Games"])


@router.get("/{game_id}", summary="Get game summary", response_model=GameSummary)
async def get_game(game_id: str, pool: asyncpg.Pool = Depends(db_pool)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql.GET_GAME, game_id)
    if not row:
        raise NotFoundError("Game", game_id)
    return GameSummary(**dict(row))


@router.get("/{game_id}/players", summary="Player stats for a game", response_model=list[PlayerGameAdvanced])
async def game_players(game_id: str, pool: asyncpg.Pool = Depends(db_pool)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql.GAME_PLAYERS, game_id)
    if not rows:
        raise NotFoundError("Game", game_id)
    return [PlayerGameAdvanced(**dict(r)) for r in rows]


@router.get("/{game_id}/shots", summary="Shot chart for a game", response_model=PaginatedResponse[ShotChartItem])
async def game_shots(
    game_id: str,
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    period: int | None = Query(None),
    team_id: int | None = Query(None),
):
    filters: list[str] = []
    params: list = [game_id, pag.per_page, pag.offset]
    next_idx = 4

    if period is not None:
        filters.append(f"period = ${next_idx}")
        params.append(period)
        next_idx += 1
    if team_id is not None:
        filters.append(f"team_id = ${next_idx}")
        params.append(team_id)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.GAME_SHOTS.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [ShotChartItem(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )


@router.get("/{game_id}/pbp", summary="Play-by-play for a game", response_model=PaginatedResponse[PlayByPlayEvent])
async def game_pbp(
    game_id: str,
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    period: int | None = Query(None),
):
    filters: list[str] = []
    params: list = [game_id, pag.per_page, pag.offset]
    next_idx = 4

    if period is not None:
        filters.append(f"period = ${next_idx}")
        params.append(period)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.GAME_PBP.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [PlayByPlayEvent(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )
