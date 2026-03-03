import math

from fastapi import APIRouter, Depends, Query
import asyncpg

from api.dependencies import db_pool, Pagination
from api.models.common import PaginatedResponse
from api.models.lineups import LineupStats
from api.queries import lineups as sql

router = APIRouter(tags=["Lineups"])

VALID_SORT_COLUMNS = {
    "total_minutes", "net_rating_per_100", "offensive_rating",
    "plus_minus", "points", "effective_fg_pct",
}


@router.get("/lineups", summary="Lineup stats leaderboard", response_model=PaginatedResponse[LineupStats])
async def list_lineups(
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    season: str | None = Query(None, description="e.g. 2024-25"),
    season_type: str | None = Query(None),
    team_id: int | None = Query(None),
    min_minutes: float | None = Query(None, description="Minimum total minutes"),
    sort_by: str = Query("total_minutes", description="Column to sort by"),
):
    if sort_by not in VALID_SORT_COLUMNS:
        sort_by = "total_minutes"

    filters: list[str] = []
    params: list = [pag.per_page, pag.offset]
    next_idx = 3

    if season:
        filters.append(f"season = ${next_idx}")
        params.append(season)
        next_idx += 1
    if season_type:
        filters.append(f"season_type = ${next_idx}")
        params.append(season_type)
        next_idx += 1
    if team_id is not None:
        filters.append(f"team_id = ${next_idx}")
        params.append(team_id)
        next_idx += 1
    if min_minutes is not None:
        filters.append(f"total_minutes >= ${next_idx}")
        params.append(min_minutes)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.LIST_LINEUPS.format(filters=filter_sql, sort_by=sort_by)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [LineupStats(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )
