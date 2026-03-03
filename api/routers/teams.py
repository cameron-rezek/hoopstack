import math

from fastapi import APIRouter, Depends, Query
import asyncpg

from api.dependencies import db_pool, Pagination
from api.exceptions import NotFoundError
from api.models.common import PaginatedResponse
from api.models.teams import TeamSummary, TeamGameLog
from api.models.lineups import LineupStats
from api.queries import teams as sql

router = APIRouter(prefix="/teams", tags=["Teams"])


def _season_to_year(season: str) -> str:
    return season.split("-")[0]


@router.get("", summary="List all NBA teams", response_model=list[TeamSummary])
async def list_teams(pool: asyncpg.Pool = Depends(db_pool)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql.LIST_TEAMS)
    return [TeamSummary(**dict(r)) for r in rows]


@router.get("/{team_id}", summary="Get team details", response_model=TeamSummary)
async def get_team(team_id: int, pool: asyncpg.Pool = Depends(db_pool)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql.GET_TEAM, team_id)
    if not row:
        raise NotFoundError("Team", team_id)
    return TeamSummary(**dict(row))


@router.get("/{team_id}/games", summary="Team game log", response_model=PaginatedResponse[TeamGameLog])
async def team_games(
    team_id: int,
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    season: str | None = Query(None, description="e.g. 2024-25"),
    season_type: str | None = Query(None),
):
    filters: list[str] = []
    params: list = [team_id, pag.per_page, pag.offset]
    next_idx = 4

    if season:
        filters.append(f"season_id LIKE '%' || ${next_idx}")
        params.append(_season_to_year(season))
        next_idx += 1
    if season_type:
        filters.append(f"season_type = ${next_idx}")
        params.append(season_type)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.TEAM_GAMES.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [TeamGameLog(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )


@router.get("/{team_id}/lineups", summary="Team lineups", response_model=PaginatedResponse[LineupStats])
async def team_lineups(
    team_id: int,
    pag: Pagination = Depends(),
    pool: asyncpg.Pool = Depends(db_pool),
    season: str | None = Query(None),
    season_type: str | None = Query(None),
    min_minutes: float | None = Query(None, description="Minimum total minutes"),
):
    filters: list[str] = []
    params: list = [team_id, pag.per_page, pag.offset]
    next_idx = 4

    if season:
        filters.append(f"season = ${next_idx}")
        params.append(season)
        next_idx += 1
    if season_type:
        filters.append(f"season_type = ${next_idx}")
        params.append(season_type)
        next_idx += 1
    if min_minutes is not None:
        filters.append(f"total_minutes >= ${next_idx}")
        params.append(min_minutes)
        next_idx += 1

    filter_sql = ("\n   AND " + "\n   AND ".join(filters)) if filters else ""
    query = sql.TEAM_LINEUPS.format(filters=filter_sql)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    total = rows[0]["_total"] if rows else 0
    data = [LineupStats(**{k: v for k, v in r.items() if k != "_total"}) for r in rows]
    return PaginatedResponse(
        data=data, total=total, page=pag.page, per_page=pag.per_page,
        total_pages=math.ceil(total / pag.per_page) if total else 0,
    )
