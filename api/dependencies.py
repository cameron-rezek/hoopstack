from fastapi import Query
import asyncpg

from api.database import get_pool


async def db_pool() -> asyncpg.Pool:
    return get_pool()


class Pagination:
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        per_page: int = Query(25, ge=1, le=100, description="Items per page"),
    ):
        self.page = page
        self.per_page = per_page
        self.offset = (page - 1) * per_page
