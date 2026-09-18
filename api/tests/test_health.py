"""Health endpoint: reachable without a database, honest about a half-built warehouse."""

import asyncpg

from api.routers.health import TABLES


def _undefined_table(query, *args):
    raise asyncpg.UndefinedTableError("relation does not exist")


async def test_health_returns_200(client):
    response = await client.get("/health")

    assert response.status_code == 200


async def test_health_reports_row_counts_per_table(connection, client):
    connection.fetchrow_result = {"cnt": 42}

    body = (await client.get("/health")).json()

    assert body["status"] == "healthy"
    assert body["database"] == "connected"
    assert body["row_counts"] == dict.fromkeys(TABLES, 42)
    assert body["missing_tables"] == []


async def test_health_degrades_when_dbt_has_not_run(connection, client):
    """
    The state a reviewer hits right after `docker compose up`: postgres is up
    and the schemas exist, but no dbt model has been built yet. That is a 200
    with null counts, not a 500 — a 500 would be indistinguishable from the API
    being unable to reach the database at all.
    """
    connection.fetchrow_result = _undefined_table

    response = await client.get("/health")
    body = response.json()

    assert response.status_code == 200
    assert body["status"] == "degraded"
    assert body["database"] == "connected"
    assert set(body["missing_tables"]) == set(TABLES)
    assert all(count is None for count in body["row_counts"].values())


async def test_health_mixes_present_and_missing_tables(connection, client):
    """A partially built warehouse: counts and missing_tables stay in agreement."""
    built = "stg_players"

    def fetchrow(query, *args):
        if built in query:
            return {"cnt": 7}
        return _undefined_table(query, *args)

    connection.fetchrow_result = fetchrow

    body = (await client.get("/health")).json()

    assert body["status"] == "degraded"
    assert body["row_counts"][built] == 7
    assert built not in body["missing_tables"]
    assert len(body["missing_tables"]) == len(TABLES) - 1
