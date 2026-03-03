from fastapi import APIRouter, Depends
import asyncpg

from api.dependencies import db_pool

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check with table row counts")
async def health(pool: asyncpg.Pool = Depends(db_pool)):
    tables = {
        "fct_player_game_advanced": "analytics.fct_player_game_advanced",
        "agg_shot_quality": "analytics.agg_shot_quality",
        "agg_lineup_stats": "analytics.agg_lineup_stats",
        "agg_player_rolling_stats": "analytics.agg_player_rolling_stats",
        "stg_players": "staging.stg_players",
        "stg_shot_charts": "staging.stg_shot_charts",
        "stg_play_by_play": "staging.stg_play_by_play",
    }
    counts = {}
    async with pool.acquire() as conn:
        for name, table in tables.items():
            row = await conn.fetchrow(f"SELECT COUNT(*) AS cnt FROM {table}")
            counts[name] = row["cnt"]

    return {"status": "healthy", "database": "connected", "row_counts": counts}
