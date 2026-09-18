import asyncpg
from fastapi import HTTPException, Query, Security
from fastapi.security import APIKeyHeader

from api.config import settings
from api.database import get_pool

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str | None = Security(_api_key_header)) -> str | None:
    """Validate API key if one is configured. No-op when API_KEY is unset."""
    if not settings.api_key:
        return None
    if api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key


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
