from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.database import create_pool, close_pool
from api.exceptions import (
    NotFoundError, DatabaseError,
    not_found_handler, database_error_handler,
)
from api.routers import health, players, teams, games, shots, lineups, rolling, pbp, seasons


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_pool()
    yield
    await close_pool()


app = FastAPI(
    title="Hoopstack API",
    description="NBA analytics API serving player stats, shot charts, lineups, and play-by-play data.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.add_exception_handler(NotFoundError, not_found_handler)
app.add_exception_handler(DatabaseError, database_error_handler)

app.include_router(health.router)
app.include_router(players.router)
app.include_router(teams.router)
app.include_router(games.router)
app.include_router(shots.router)
app.include_router(lineups.router)
app.include_router(rolling.router)
app.include_router(pbp.router)
app.include_router(seasons.router)
