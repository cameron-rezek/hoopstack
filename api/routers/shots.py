import math

import asyncpg
from fastapi import APIRouter, Depends, Query

from api.dependencies import Pagination, db_pool
from api.models.common import PaginatedResponse
from api.models.shots import ShotQuality
from api.queries import shots as sql

router = APIRouter(tags=["Shot Quality"])

VALID_SORT_COLUMNS = {
    "pax_per_100_shots", "total_points_above_expected", "shot_quality_score",
    "shot_making_score", "fg_pct", "total_shots",
}


@router.get("/shot-quality", summary="Shot quality leaderboard", response_model=PaginatedResponse[ShotQuality])
async def shot_quality_leaderboard(
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    season: str | None = Query(None, description="e.g. 2024-25"),
    season_type: str | None = Query(None),
    team_id: int | None = Query(None),
    min_shots: int | None = Query(None, description="Minimum total shots"),
    sort_by: str = Query("pax_per_100_shots", description="Column to sort by"),
):
    if sort_by not in VALID_SORT_COLUMNS:
        sort_by = "pax_per_100_shots"

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
    if min_shots is not None:
        filters.append(f"total_shots >= ${next_idx}")
        params.append(min_shots)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.SHOT_QUALITY_LEADERBOARD.format(filters=filter_sql, sort_by=sort_by)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [ShotQuality(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )
