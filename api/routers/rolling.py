import math

import asyncpg
from fastapi import APIRouter, Depends, Query

from api.dependencies import Pagination, db_pool
from api.models.common import PaginatedResponse
from api.models.rolling import PlayerRollingStats
from api.queries import rolling as sql

router = APIRouter(tags=["Rolling Stats"])


def _season_to_year(season: str) -> str:
    return season.split("-")[0]


@router.get("/rolling", summary="Player rolling stats", response_model=PaginatedResponse[PlayerRollingStats])
async def list_rolling(
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    player_id: int | None = Query(None),
    season: str | None = Query(None, description="e.g. 2024-25"),
    season_type: str | None = Query(None),
    team_id: int | None = Query(None),
):
    filters: list[str] = []
    params: list = [pag.per_page, pag.offset]
    next_idx = 3

    if player_id is not None:
        filters.append(f"player_id = ${next_idx}")
        params.append(player_id)
        next_idx += 1
    if season:
        filters.append(f"season_id LIKE '%' || ${next_idx}")
        params.append(_season_to_year(season))
        next_idx += 1
    if season_type:
        filters.append(f"season_type = ${next_idx}")
        params.append(season_type)
        next_idx += 1
    if team_id is not None:
        filters.append(f"team_id = ${next_idx}")
        params.append(team_id)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.LIST_ROLLING.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [PlayerRollingStats(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )
