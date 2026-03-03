import asyncpg

from api.config import settings

pool: asyncpg.Pool | None = None


async def create_pool() -> asyncpg.Pool:
    global pool
    pool = await asyncpg.create_pool(
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
        user=settings.db_user,
        password=settings.db_password,
        min_size=settings.db_pool_min,
        max_size=settings.db_pool_max,
    )
    return pool


async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None


def get_pool() -> asyncpg.Pool:
    assert pool is not None, "Database pool not initialized"
    return pool
