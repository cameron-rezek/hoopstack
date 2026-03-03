import math

from fastapi import APIRouter, Depends, Query
import asyncpg

from api.dependencies import db_pool, Pagination
from api.models.common import PaginatedResponse
from api.models.pbp import PlayByPlayEvent
from api.queries import pbp as sql

router = APIRouter(tags=["Play-by-Play"])


@router.get("/pbp", summary="Play-by-play events", response_model=PaginatedResponse[PlayByPlayEvent])
async def list_pbp(
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    game_id: str | None = Query(None),
    period: int | None = Query(None),
    player_id: int | None = Query(None),
    team_id: int | None = Query(None),
):
    filters: list[str] = []
    params: list = [pag.per_page, pag.offset]
    next_idx = 3

    if game_id:
        filters.append(f"game_id = ${next_idx}")
        params.append(game_id)
        next_idx += 1
    if period is not None:
        filters.append(f"period = ${next_idx}")
        params.append(period)
        next_idx += 1
    if player_id is not None:
        filters.append(f"player_id = ${next_idx}")
        params.append(player_id)
        next_idx += 1
    if team_id is not None:
        filters.append(f"team_id = ${next_idx}")
        params.append(team_id)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.LIST_PBP.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [PlayByPlayEvent(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )
