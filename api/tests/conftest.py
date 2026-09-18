"""
Shared fixtures for the API test suite.

Two things have to happen before `api.main` is importable:

1. `api.config.Settings` has required DB_* fields and is instantiated at import
   time, so the environment must be populated first. These are dummy values —
   nothing here ever opens a socket.
2. The asyncpg pool must never be created. We drive the app through
   httpx.ASGITransport, which does not run FastAPI's lifespan, so `create_pool`
   is never called; the `db_pool` dependency is overridden with a fake instead.
"""

import os

# Must precede any `api.*` import — see note 1 above.
os.environ.setdefault("DB_HOST", "test-host")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "test-db")
os.environ.setdefault("DB_USER", "test-user")
os.environ.setdefault("DB_PASSWORD", "test-password")
os.environ.setdefault("API_KEY", "")

from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from api.config import settings
from api.dependencies import db_pool
from api.main import app


class FakeConnection:
    """
    Stands in for an asyncpg connection.

    `fetchrow_result` / `fetch_result` may be a value or a callable taking
    (query, *args); a callable that raises lets a test simulate a Postgres
    error such as UndefinedTableError.
    """

    def __init__(self, fetchrow_result=None, fetch_result=None):
        self.fetchrow_result = fetchrow_result
        self.fetch_result = fetch_result if fetch_result is not None else []
        self.queries: list[tuple] = []

    async def fetchrow(self, query, *args):
        self.queries.append((query, args))
        if callable(self.fetchrow_result):
            return self.fetchrow_result(query, *args)
        return self.fetchrow_result

    async def fetch(self, query, *args):
        self.queries.append((query, args))
        if callable(self.fetch_result):
            return self.fetch_result(query, *args)
        return self.fetch_result


class FakePool:
    """Mimics the one asyncpg.Pool behaviour the routers use: `async with pool.acquire()`."""

    def __init__(self, connection: FakeConnection):
        self.connection = connection

    def acquire(self):
        @asynccontextmanager
        async def _acquire():
            yield self.connection

        return _acquire()


@pytest.fixture
def connection() -> FakeConnection:
    """
    Default connection: every fetchrow looks like a zero COUNT(*), every fetch
    an empty result set. That is enough for /health and for auth tests that
    only care about the status code. Tests that need a real row — or no row,
    for a 404 — assign to `connection.fetchrow_result` directly.
    """
    return FakeConnection(fetchrow_result={"cnt": 0})


@pytest_asyncio.fixture
async def client(connection):
    """
    An httpx client bound to the app with the database dependency faked out.

    ASGITransport skips the lifespan, so no pool is ever created and no
    Postgres instance is required.
    """
    app.dependency_overrides[db_pool] = lambda: FakePool(connection)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def api_key(request):
    """
    Set settings.api_key for the duration of a test, then restore it.

    Parametrised via @pytest.mark.parametrize("api_key", ["secret"], indirect=True).
    """
    original = settings.api_key
    settings.api_key = request.param
    yield request.param
    settings.api_key = original
