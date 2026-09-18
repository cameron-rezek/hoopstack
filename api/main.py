from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from api.config import settings
from api.database import close_pool, create_pool
from api.dependencies import verify_api_key
from api.exceptions import (
    DatabaseError,
    NotFoundError,
    database_error_handler,
    not_found_handler,
)
from api.routers import games, health, lineups, pbp, players, rolling, seasons, shots, teams

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


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
    dependencies=[Depends(verify_api_key)],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
