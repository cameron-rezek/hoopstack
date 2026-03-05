# Hoopstack

An NBA analytics platform built on 3 seasons of play-by-play, shot chart, and game log data. Ingests raw data from the NBA Stats API, transforms it through a layered data model (raw → staging → analytics), and serves it through a REST API to power interactive visualizations.

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

- **Database:** PostgreSQL 16 on Unraid server (192.168.1.22:5434)
- **Ingestion:** Python scripts on Mac Mini (192.168.1.18), checkpointed and resumable
- **Transformations:** dbt Core (staging views + analytics tables)
- **API:** FastAPI with asyncpg, 20 endpoints
- **Frontend:** Next.js 16 + D3.js + Recharts, dark theme

## Data

- **Source:** NBA Stats API via `nba_api` Python library
- **Scope:** 2023-24 through 2025-26 (3 seasons)
- **Volume:** ~560k shot attempts, ~1.16M play-by-play events, ~75k player game logs
- **Update cadence:** Manual — re-run ingestion to pull new games (see below)

## Tech Stack

| Layer | Tech |
|-------|------|
| Database | PostgreSQL 16 |
| Ingestion | Python, nba_api |
| Transformations | dbt Core 1.11, dbt-postgres |
| API | FastAPI, asyncpg, Pydantic |
| Frontend | Next.js 16, React 19, D3.js 7, Recharts, Tailwind 4 |
| Infrastructure | Unraid (DB), Mac Mini (ingestion) |

## Project Structure

```
hoopstack/
├── ingestion/       # Python ETL scripts (also on Mac Mini at ~/ingestion-hoopstack/)
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

- **PostgreSQL** running and accessible (Unraid server or local)
- **Python 3.11+** (for API and ingestion)
- **Node.js 18+** (for frontend)
- Network access to the database host

## Getting Started

### 1. Start the API

```bash
cd hoopstack
source api-venv/bin/activate
uvicorn api.main:app --reload --port 8000
```

Verify at:
- Health check: http://localhost:8000/health
- Interactive docs: http://localhost:8000/docs

The API reads its database connection from `api/.env`:

```
DB_HOST=192.168.1.22
DB_PORT=5434
DB_NAME=nba_analytics
DB_USER=nba_admin
DB_PASSWORD=<your-password>
```

### 2. Start the Frontend

In a separate terminal:

```bash
cd hoopstack/frontend
npm run dev
```

Opens at http://localhost:3000. The frontend connects to the API via `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Browse the App

| Page | What it shows |
|------|---------------|
| `/` | Dashboard home |
| `/players` | Player directory with search |
| `/players/[id]` | Player detail — shot chart (scatter/hexbin/zone), stats, game log |
| `/teams` | Team directory |
| `/teams/[id]` | Team detail — roster, stats, game results |
| `/games/[id]` | Game detail — box score, play-by-play, shot chart |
| `/leaderboards` | Stat leaderboards with season filtering |

## Updating Data

Data does **not** update automatically. To pull new games:

### Step 1: Run Ingestion

On the Mac Mini (where ingestion is set up):

```bash
cd ~/ingestion-hoopstack
source .venv/bin/activate
python -m ingestion.run_backfill --start 2023 --end 2025
```

This pulls any new games, shots, and play-by-play since the last run. The checkpoint system skips already-loaded data, so it only fetches what's new.

**Important flags:**
- `--start 2023 --end 2025` — limits to your 3-season scope (without this, it defaults to 2010-11 onward)
- `--tier season` — only run season-level data (game logs, stats)
- `--tier game` — only run per-game data (shots, play-by-play)
- `--reset` — clear checkpoints and re-pull everything

**Timing notes:**
- The NBA API throttles after ~500-600 rapid calls. The ingestion has a 5-second delay between requests and a cooldown mechanism (3 consecutive failures → 5-minute pause).
- Best to run overnight when API traffic is lower.
- Catching up on a few weeks of games takes ~1-2 hours.

### Step 2: Refresh dbt Models

After ingestion, rebuild the analytics tables:

```bash
cd hoopstack/dbt
source ../dbt-venv/bin/activate
dbt run
```

To also validate data quality:

```bash
dbt test
```

### Step 3: Verify

The API serves live queries against the database — no restart needed. Just refresh the frontend to see updated data.

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

| Model | Rows | Description |
|-------|------|-------------|
| `fct_player_game_advanced` | ~74.5k | Advanced per-game metrics (TS%, usage, etc.) |
| `agg_shot_quality` | ~1.9k | Shot quality aggregates by player/season/zone |
| `agg_lineup_stats` | ~8.3k | Lineup performance metrics |
| `agg_player_rolling_stats` | ~74.5k | Rolling averages for trend analysis |

## API Endpoints

20 endpoints across 9 routers. Key ones:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + DB connectivity |
| `GET /api/players` | List players (search, pagination) |
| `GET /api/players/{id}` | Player details |
| `GET /api/players/{id}/game-log` | Player game log by season |
| `GET /api/players/{id}/shots` | Player shot chart data |
| `GET /api/teams` | List teams |
| `GET /api/teams/{id}` | Team details + roster |
| `GET /api/games/{id}` | Game box score |
| `GET /api/games/{id}/pbp` | Play-by-play for a game |
| `GET /api/shot-quality/{id}` | Shot quality breakdown |
| `GET /api/lineups/{id}` | Lineup stats for a team |
| `GET /api/rolling/{id}` | Rolling stat averages for a player |

Full interactive docs at http://localhost:8000/docs when the API is running.

## Known Quirks

- **Season ID formats vary:** Game logs and rolling stats use numeric IDs like `"22024"`. Shots and lineups use `"2024-25"`. The API accepts `"2024-25"` and converts internally.
- **`dims.dim_teams` is empty.** Team data is served from `raw.team_details` instead (no conference/division/colors).
- **Box score tables exist but are empty.** Per-game box scores were dropped from scope because the NBA API throttles too aggressively. Game logs cover the same data at season granularity.
- **Password has special characters (`!!`)** which break shell `export`. The dbt profile in `~/.dbt/profiles.yml` and the API `.env` file hardcode the password instead of using env vars.
