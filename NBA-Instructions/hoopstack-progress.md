# Hoopstack: Progress Log & Handoff Doc

## Project Overview
NBA analytics platform built as a portfolio piece. Full plan is in the project file `nba-analytics-plan.md`.

**Repo:** https://github.com/cameron-rezek/hoopstack

---

## Infrastructure Completed

### PostgreSQL 16 Container (postgres-nba)
- Running on Unraid server at `192.168.1.22`
- **Host port:** 5434 (internal 5432)
- **Data path:** `/mnt/cache/appdata/postgres-nba`
- **Database:** `nba_analytics`
- **User:** `nba_admin`
- **Password:** `ElephantLoopy!!84`
- Separate from existing `postgres-overland` container (which uses port 5432; port 5433 was taken by something else)

### pgAdmin Container
- Running on Unraid at `192.168.1.22:5050`
- **Data path:** `/mnt/cache/appdata/pgadmin`
- Had a permissions issue on first start — fixed with `chown -R 5050:5050 /mnt/cache/appdata/pgadmin`
- Connected to postgres-nba successfully

### Containers NOT yet set up
- Redis (cache layer, optional for now, needed in Phase 2)
- Airflow/Dagster (orchestration, needed later in Phase 1 for scheduling)
- FastAPI (Phase 2)

---

## Database Schema Completed

All four schemas created in `nba_analytics` database:

```
raw        — Bronze layer, mirrors API responses
staging    — Silver layer, cleaned/transformed (tables created by dbt later)
analytics  — Gold layer, pre-computed metrics (tables created by dbt later)
dims       — Dimension tables
```

### Raw Tables Created (12 tables)
- `raw.shot_chart_detail` — every shot attempt with x/y court coordinates
- `raw.play_by_play` — full play-by-play events per game
- `raw.common_player_info` — player bio/demographic info
- `raw.box_score_traditional` — traditional box score stats (player-level)
- `raw.box_score_advanced` — advanced box score metrics (player-level)
- `raw.box_score_misc` — misc stats like second chance pts, fast break pts (player-level)
- `raw.box_score_team_traditional` — team-level box score totals per game
- `raw.player_game_logs` — player-level game logs
- `raw.team_game_logs` — team-level game logs
- `raw.lineup_stats` — lineup combination stats
- `raw.league_dash_player_stats` — season aggregate player stats
- `raw.team_details` — team info, arena, coaching staff
- `raw.draft_history` — full draft history

All raw tables include `ingested_at TIMESTAMP DEFAULT NOW()` and `source VARCHAR(50) DEFAULT 'nba_api'` for data lineage.

Note: the `"to"` column in box_score_traditional and box_score_team_traditional is quoted because TO is a SQL reserved word.

### Dimension Tables Created (5 tables)
- `dims.dim_players`
- `dims.dim_teams` (includes primary_color, secondary_color for viz)
- `dims.dim_seasons`
- `dims.dim_team_history` (slowly changing dimension for relocations/rebrandings)
- `dims.dim_game_types` (seeded with: Regular Season, Playoffs, All Star, Pre Season, Play-In)

### Staging & Analytics Tables
Not yet created — these will be built by dbt models later in Phase 1 Week 2-3.

---

## GitHub Repo Completed

**Repo:** https://github.com/cameron-rezek/hoopstack

### Folder Structure
```
hoopstack/
├── .gitignore
├── README.md
├── ingestion/       # Python ETL scripts (next up)
├── dbt/
│   ├── models/
│   │   ├── staging/
│   │   └── analytics/
│   └── tests/
├── api/             # FastAPI (Phase 2)
├── frontend/        # Next.js + D3.js (Phase 2)
├── scripts/         # Utility scripts, backfills
└── docs/            # Architecture diagrams, notes
```

### Commits
1. `5a47ba0` — Initial project structure, README, and gitignore
2. (needs one more) — Fix .gitignore filename (was saved as `gitignore`, needs `mv gitignore .gitignore`)

**NOTE:** The .gitignore file may still be named `gitignore` without the leading dot. Run this if not done yet:
```bash
mv gitignore .gitignore
git add .
git commit -m "Fix .gitignore filename"
git push origin main
```

---

## Where We Are in the Plan

**Phase 1: Data Foundation (2-3 weeks)**

- [x] Week 1: Spin up PostgreSQL, pgAdmin, Redis containers — DONE (Redis deferred)
- [x] Week 1: Design and create raw, staging, analytics, dims schemas — DONE
- [x] Week 1: Set up GitHub repo with README — DONE
- [ ] Week 1: Initialize dbt project with source definitions — NOT STARTED
- [ ] Week 1-2: Write Python ingestion scripts — **THIS IS NEXT**
- [ ] Week 1-2: Smoke test with 2023-present data
- [ ] Week 1-2: Full historical backfill 2010-11 through present (3-5 hours)
- [ ] Week 1-2: Set up Airflow/Dagster/cron for nightly ingestion
- [ ] Week 2-3: Build dbt staging models
- [ ] Week 2-3: Build dbt analytics models
- [ ] Week 2-3: Write dbt tests
- [ ] Week 2-3: Generate dbt docs

---

## What's Next: Python Ingestion Scripts

The immediate next task is writing the Python ETL scripts in the `ingestion/` folder that pull data from the NBA Stats API (via the `nba_api` library) and insert it into the raw tables.

### Key decisions from the plan:
- Use the `nba_api` Python library to hit the undocumented NBA Stats API endpoints
- Rate limit aggressively (1-2 second delays between requests)
- Build retry logic and per-game error handling so one bad game doesn't kill a full season backfill
- Implement idempotent upserts (so re-running is safe)
- Start with 2023-present as a smoke test, then do the full 2010-11 backfill
- The backfill for 15 seasons should take 3-5 hours with conservative rate limiting

### Endpoints to ingest (mapped to raw tables):
| Endpoint | Raw Table |
|----------|-----------|
| `shotchartdetail` | `raw.shot_chart_detail` |
| `playbyplayv2` | `raw.play_by_play` |
| `boxscoretraditionalv2` | `raw.box_score_traditional` + `raw.box_score_team_traditional` |
| `boxscoreadvancedv2` | `raw.box_score_advanced` |
| `boxscoremiscv2` | `raw.box_score_misc` |
| `leaguegamefinder` | `raw.player_game_logs` + `raw.team_game_logs` |
| `leaguedashlineups` | `raw.lineup_stats` |
| `leaguedashplayerstats` | `raw.league_dash_player_stats` |
| `commonplayerinfo` | `raw.common_player_info` |
| `teamdetails` | `raw.team_details` |
| `drafthistory` | `raw.draft_history` |

### Python dependencies needed:
- `nba_api` — NBA Stats API wrapper
- `psycopg2` or `asyncpg` — PostgreSQL connection
- `pandas` — light transforms before loading
- `python-dotenv` — environment variable management (DB credentials)

### Dev environment:
- Working from Mac
- Code lives in `~/Projects/hoopstack/`
- Postgres accessible at `192.168.1.22:5434`

---

## Environment Details
- **Unraid server:** 192.168.1.22, Unraid OS 7.2.2, 40TB+ storage
- **Dev machine:** Mac (username: cameronrezek, home: ~/Projects/hoopstack/)
- **Unraid already running:** 40+ Docker containers, reverse proxy (type unknown), various *arr apps, homepage, etc.
