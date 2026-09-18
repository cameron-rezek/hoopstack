import asyncpg
from fastapi import APIRouter, Depends

from api.dependencies import db_pool

router = APIRouter(tags=["Health"])

TABLES = {
    "fct_player_game_advanced": "analytics.fct_player_game_advanced",
    "agg_shot_quality": "analytics.agg_shot_quality",
    "agg_lineup_stats": "analytics.agg_lineup_stats",
    "agg_player_rolling_stats": "analytics.agg_player_rolling_stats",
    "stg_players": "staging.stg_players",
    "stg_shot_charts": "staging.stg_shot_charts",
    "stg_play_by_play": "staging.stg_play_by_play",
}


@router.get("/health", summary="Health check with table row counts")
async def health(pool: asyncpg.Pool = Depends(db_pool)):
    """
    Reports connectivity plus a row count per modelled table.

    A table that does not exist yet is reported as null rather than raising, so
    a freshly provisioned database (schemas created, dbt not yet run) still
    returns 200. That distinguishes "the API cannot reach postgres" from
    "postgres is fine, the warehouse just has not been built yet" — the latter
    is the expected state right after `docker compose up`.
    """
    counts: dict[str, int | None] = {}
    missing: list[str] = []

    async with pool.acquire() as conn:
        for name, table in TABLES.items():
            try:
                row = await conn.fetchrow(f"SELECT COUNT(*) AS cnt FROM {table}")
                counts[name] = row["cnt"]
            except asyncpg.UndefinedTableError:
                counts[name] = None
                missing.append(name)

    return {
        "status": "healthy" if not missing else "degraded",
        "database": "connected",
        "row_counts": counts,
        "missing_tables": missing,
    }
