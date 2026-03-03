from fastapi import APIRouter, Depends
import asyncpg

from api.dependencies import db_pool

router = APIRouter(tags=["Seasons"])

SEASONS_QUERY = """
SELECT DISTINCT season
  FROM analytics.agg_shot_quality
 ORDER BY season DESC
"""


@router.get("/seasons", summary="Available seasons", response_model=list[str])
async def list_seasons(pool: asyncpg.Pool = Depends(db_pool)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(SEASONS_QUERY)
    return [r["season"] for r in rows]
