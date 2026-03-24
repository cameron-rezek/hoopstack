# Hoopstack

An NBA analytics platform built on play-by-play, shot chart, and game log data. Ingests raw data from the NBA Stats API, transforms it through a layered data model (raw → staging → analytics), and serves it through a REST API to power interactive visualizations.

## Architecture

```
NBA Stats API → Python Ingestion → PostgreSQL (Raw)
                                        ↓
                                   dbt (Staging + Analytics)
                                        ↓
                                   FastAPI (REST API)
                                        ↓
                                   Next.js + D3.js (Frontend)
```

- **Database:** PostgreSQL 16
- **Ingestion:** Python scripts with checkpointing and resume support
- **Transformations:** dbt Core (staging views + analytics tables)
- **API:** FastAPI with asyncpg, API key auth, rate limiting
- **Frontend:** Next.js 16 + D3.js + Recharts, dark theme

## Data

- **Source:** NBA Stats API via `nba_api` Python library
- **Scope:** 2023-24 through 2025-26 seasons
- **Volume:** ~560k shot attempts, ~1.16M play-by-play events, ~75k player game logs
- **Update cadence:** Daily cron job at 6am (+ manual backfill as needed)

## Tech Stack

| Layer | Tech |
|-------|------|
| Database | PostgreSQL 16 |
| Ingestion | Python, nba_api |
| Transformations | dbt Core 1.11, dbt-postgres |
| API | FastAPI, asyncpg, Pydantic, slowapi |
| Frontend | Next.js 16, React 19, D3.js 7, Recharts, Tailwind 4 |

## Project Structure

```
hoopstack/
├── ingestion/       # Python ETL scripts
├── dbt/             # dbt project
│   └── models/
│       ├── staging/     # 6 deduped views (stg_players, stg_shot_charts, etc.)
│       └── analytics/   # 4 aggregate tables (shot quality, lineups, rolling stats, etc.)
├── api/             # FastAPI application
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── routers/     # 9 routers: players, teams, games, shots, lineups, rolling, pbp, seasons, health
│   ├── queries/     # Raw SQL queries (no ORM)
│   └── models/      # Pydantic response models
├── frontend/        # Next.js app
│   └── src/
│       ├── app/         # 7 routes: /, /players, /players/[id], /teams, /teams/[id], /games/[id], /leaderboards
│       ├── components/  # 40+ components (shot chart, tables, charts, layout)
│       ├── lib/         # API client, utilities
│       └── contexts/    # Season context for global filtering
├── scripts/         # DB migration and index scripts
└── NBA-Instructions/# Planning docs and progress notes
```

## Prerequisites

- **PostgreSQL** running and accessible
- **Python 3.11+** (for API and ingestion)
- **Node.js 18+** (for frontend)

## Getting Started

### 1. Configure Environment

Copy the example env files and fill in your database credentials:

```bash
cp api/.env.example api/.env
cp ingestion/.env.example ingestion/.env
```

Edit each `.env` with your database host, port, name, user, and password.

### 2. Start the API

```bash
cd hoopstack
source api-venv/bin/activate
uvicorn api.main:app --reload --port 8000
```

Verify at:
- Health check: http://localhost:8000/health
- Interactive docs: http://localhost:8000/docs

### 3. Start the Frontend

In a separate terminal:

```bash
cd hoopstack/frontend
npm run dev
```

Opens at http://localhost:3000. To connect to a non-default API URL or enable API key auth, create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=your-api-key-here
```

### 4. Browse the App

| Page | What it shows |
|------|---------------|
| `/` | Dashboard home |
| `/players` | Player directory with search |
| `/players/[id]` | Player detail — shot chart (scatter/hexbin/zone), stats, game log |
| `/teams` | Team directory |
| `/teams/[id]` | Team detail — roster, stats, game results |
| `/games/[id]` | Game detail — box score, play-by-play, shot chart |
| `/leaderboards` | Stat leaderboards with season filtering |

## API Authentication & Rate Limiting

- **API key auth** is opt-in. Set `API_KEY` in `api/.env` to enforce it. Clients must send the key in the `X-API-Key` header. Leave `API_KEY` empty to disable auth (useful for local dev).
- **Rate limiting** is enabled by default at 60 requests/minute per IP via slowapi.

## Updating Data

### Daily Updates (Automated)

A cron job runs `run_daily.py --refresh-season` at 6am daily. It:
1. Refreshes game logs for the current season
2. Ingests per-game data (shots, play-by-play, box scores) for yesterday's games
3. Refreshes season-level aggregates (lineups, player stats)

Output is logged to `ingestion/cron.log`. Note: the cron only fires when the machine is awake.

### Manual Ingestion

```bash
cd ingestion
source .venv/bin/activate

# Ingest yesterday's games
python run_daily.py

# Ingest a specific date
python run_daily.py --date 2026-03-22

# Backfill an entire season (resumable via checkpoints)
python run_backfill.py --start 2025 --end 2025

# Backfill specific tiers only
python run_backfill.py --start 2025 --end 2025 --tier season   # game logs + stats
python run_backfill.py --start 2025 --end 2025 --tier game     # shots + play-by-play

# Reset checkpoints and re-pull everything
python run_backfill.py --reset
```

**Timing notes:**
- The NBA API throttles after ~500-600 rapid calls. The ingestion has configurable delays and a cooldown mechanism (3 consecutive failures → 5-minute pause).
- A full season backfill (game tier) takes several hours due to API rate limits.
- The checkpoint system means you can stop and resume safely.

### After Ingestion: Refresh dbt Models

```bash
cd hoopstack/dbt
source ../dbt-venv/bin/activate
dbt run        # Rebuild analytics tables
dbt test       # Validate data quality
```

The API serves live queries — no restart needed. Just refresh the frontend.

## dbt Models

### Staging (views in `staging` schema)

| Model | Description |
|-------|-------------|
| `stg_players` | Deduplicated player roster info |
| `stg_shot_charts` | Cleaned shot attempt data |
| `stg_play_by_play` | Play-by-play events (V3 format) |
| `stg_player_game_logs` | Per-player per-game box scores |
| `stg_team_game_logs` | Per-team per-game box scores |
| `stg_lineup_stats` | Five-man lineup combinations |

### Analytics (tables in `analytics` schema)

| Model | Description |
|-------|-------------|
| `fct_player_game_advanced` | Advanced per-game metrics (TS%, usage, etc.) |
| `agg_shot_quality` | Shot quality aggregates by player/season/zone |
| `agg_lineup_stats` | Lineup performance metrics |
| `agg_player_rolling_stats` | Rolling averages for trend analysis |

## API Endpoints

20 endpoints across 9 routers. Key ones:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + DB connectivity |
| `GET /players` | List players (search, pagination) |
| `GET /players/{id}` | Player details |
| `GET /players/{id}/games` | Player game log by season |
| `GET /players/{id}/shots` | Player shot chart data |
| `GET /teams` | List teams |
| `GET /teams/{id}` | Team details + roster |
| `GET /games/{id}` | Game box score |
| `GET /games/{id}/pbp` | Play-by-play for a game |
| `GET /shot-quality` | Shot quality leaderboard |
| `GET /lineups` | Lineup stats leaderboard |
| `GET /rolling` | Rolling stat averages |

Full interactive docs at http://localhost:8000/docs when the API is running.

## Known Quirks

- **Season ID formats vary:** Game logs and rolling stats use numeric IDs like `"22024"`. Shots and lineups use `"2024-25"`. The API accepts `"2024-25"` and converts internally.
- **`dims.dim_teams` is empty.** Team data is served from `raw.team_details` instead (no conference/division/colors).
- **Box score tables exist but are empty.** Per-game box scores were dropped from scope because the NBA API throttles too aggressively. Game logs cover the same data at season granularity.
