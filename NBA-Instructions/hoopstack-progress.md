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

### FastAPI Backend (completed 2026-03-03)
- Running locally via uvicorn (not yet containerized)
- venv: `api-venv/`, deps in `api/requirements.txt`
- Start: `source api-venv/bin/activate && uvicorn api.main:app --reload --port 8000`
- Docs: `http://localhost:8000/docs`

### Containers NOT yet set up
- Redis (cache layer, optional for now)
- Airflow/Dagster (orchestration, needed later for scheduling)
- FastAPI Docker container (currently running locally)

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

### Staging Views Created by dbt (2026-03-03)
6 views in the `staging` schema, created via `dbt run`:
- `staging.stg_players` — deduplicated from `raw.common_player_info`
- `staging.stg_shot_charts` — from `raw.shot_chart_detail`, adds computed `distance_feet`, `shot_angle`, `game_minutes_elapsed`, `is_location_reliable`, `shot_value`
- `staging.stg_play_by_play` — from `raw.play_by_play` (V3), adds `score_differential`, renames `person_id` -> `player_id`
- `staging.stg_player_game_logs` — from `raw.player_game_logs`, renames abbreviated columns to readable names, adds `home_away`
- `staging.stg_team_game_logs` — from `raw.team_game_logs`, same pattern as player game logs
- `staging.stg_lineup_stats` — from `raw.lineup_stats`, renames abbreviated columns, drops rank columns

All staging models use dedup pattern: `row_number() over (partition by <natural_key> order by ingested_at desc) where rn = 1`

### Analytics Tables Created by dbt (2026-03-03)
4 materialized tables in the `analytics` schema, created via `dbt run`:

- `analytics.fct_player_game_advanced` (74,499 rows) — Player-game fact table joining `stg_player_game_logs` + `stg_team_game_logs`. Computes: true_shooting_pct, effective_fg_pct, usage_rate, assist_pct, turnover_pct, offensive/defensive_rebound_pct, game_score (Hollinger), pace. Filters out DNP players (minutes_played <= 0). TS% and usage_rate are null for players with zero shot attempts (~3,446 rows).
- `analytics.agg_shot_quality` (1,905 rows) — Player-season shot quality metrics from `stg_shot_charts`. Zone-based league-average FG% (~40-60 bins by zone/area/range/shot_type) used as expected make probability. Aggregates: total_expected_points, total_actual_points, total_points_above_expected, pax_per_100_shots, shot_quality_score (shot selection), shot_making_score (shooting skill).
- `analytics.agg_lineup_stats` (8,318 rows) — Lineup analytics from `stg_lineup_stats`. Adds four factors (eFG%, turnover_pct, offensive_rebound_pct, free_throw_rate), estimated_possessions_per_game, offensive_rating, net_rating_per_100, sample_size_flag (very_small/small/moderate/reliable based on total minutes).
- `analytics.agg_player_rolling_stats` (74,499 rows) — Rolling averages from `fct_player_game_advanced`. 5/10/20-game and season-to-date averages for: points, assists, rebounds, TS%, usage_rate, plus_minus, game_score. Includes season_game_number for sparkline x-axis. Uses PostgreSQL named WINDOW clauses.

51 dbt tests defined and passing (unique, not_null, accepted_values, unique_combination_of_columns).

---

## GitHub Repo Completed

**Repo:** https://github.com/cameron-rezek/hoopstack

### Folder Structure
```
hoopstack/
├── .gitignore
├── README.md
├── ingestion/              # Python ETL scripts
├── dbt/                    # dbt project (initialized 2026-03-03)
│   ├── dbt_project.yml
│   ├── packages.yml
│   ├── package-lock.yml
│   ├── macros/
│   │   └── generate_schema_name.sql
│   ├── models/
│   │   ├── staging/        # 6 staging views + sources/tests YAML
│   │   └── analytics/      # 4 analytics tables + tests YAML
│   ├── seeds/
│   ├── snapshots/
│   ├── tests/
│   └── analyses/
├── dbt-venv/               # Python venv for dbt (gitignored)
├── api/                    # FastAPI backend (completed 2026-03-03)
│   ├── main.py             # App entry point, lifespan, CORS, routers
│   ├── config.py           # pydantic-settings, DB config from .env
│   ├── database.py         # asyncpg connection pool
│   ├── dependencies.py     # Pagination, DB pool dependency
│   ├── exceptions.py       # NotFoundError, DatabaseError
│   ├── models/             # Pydantic response schemas (8 files)
│   ├── routers/            # Endpoint definitions (9 files)
│   ├── queries/            # Raw SQL by domain (7 files)
│   └── .env                # DB credentials (gitignored)
├── api-venv/               # Python venv for API (gitignored)
├── frontend/               # Next.js + D3.js (Phase 2, not yet started)
├── scripts/                # Utility scripts, backfills, index SQL
└── docs/                   # Architecture diagrams, notes
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

**Phase 1: Data Foundation (2-3 weeks) — COMPLETE**

- [x] Week 1: Spin up PostgreSQL, pgAdmin, Redis containers — DONE (Redis deferred)
- [x] Week 1: Design and create raw, staging, analytics, dims schemas — DONE
- [x] Week 1: Set up GitHub repo with README — DONE
- [x] Week 1-2: Write Python ingestion scripts — DONE
- [x] Week 1-2: Ingestion code deployed to Mac Mini for long-running backfill
- [x] Week 1-2: Smoke test backfill (2023-2025) — Reference + season tiers DONE; game tier DONE (shots + PBP)
- [x] Week 1-2: Game tier backfill complete (2023-24, 2024-25, 2025-26) — All shots + PBP loaded, 0 errors on final run
- [ ] ~~Week 1-2: Full historical backfill 2010-11 through present~~ — DEFERRED (2023-2025 is sufficient for portfolio)
- [ ] ~~Week 1-2: Per-game box scores~~ — DROPPED (NBA API throttles too aggressively; game_logs cover box score needs)
- [x] Week 1: Initialize dbt project with source definitions — DONE (2026-03-03)
- [x] Week 2-3: Build dbt staging models — DONE (2026-03-03, 6 views in staging schema)
- [x] Week 2-3: Write dbt tests — DONE (2026-03-03, 51 tests all passing)
- [x] Week 2-3: Generate dbt docs — DONE (2026-03-03, catalog + lineage graph)
- [x] Week 2-3: Build dbt analytics models — DONE (2026-03-03, 4 tables in analytics schema)
- [ ] Week 1-2: Set up Airflow/Dagster/cron for nightly ingestion

**Phase 2: API + Core Visualizations (3-4 weeks) — API DONE, frontend next**

- [x] Week 4: FastAPI project scaffolding — DONE (2026-03-03)
- [x] Week 4: Core endpoints (players, teams, games, shots, lineups) — DONE (20 endpoints)
- [x] Week 4: Query parameterization, filtering, pagination — DONE
- [x] Week 4: Auto-generated OpenAPI docs verified — DONE (http://localhost:8000/docs)
- [x] Week 4: Database indexes for API query performance — DONE (8 indexes)
- [ ] Week 5-6: Next.js frontend scaffolding + shot charts
- [ ] Week 7: Player comparison dashboard
- [ ] Week 7: Tableau Public portfolio (parallel track)

---

## Current Backfill Status (as of 2026-03-03)

### Scope Decision (2026-03-02)
**Per-game box scores (BoxScoreTraditionalV3, BoxScoreAdvancedV3, BoxScoreMiscV3) have been dropped from scope.** Each game requires 3 API calls for box scores, causing aggressive NBA API throttling after ~200 games (~600 calls). The `player_game_logs` and `team_game_logs` tables (loaded via the season-level tier) already contain per-game box score stats (pts, reb, ast, fg%, etc.) and are sufficient for the analytics layer. Per-game advanced/misc metrics are supplementary and not worth the API pain.

The V3 migration script (`scripts/migrate_box_scores_v3.sql`) was run on 2026-03-02 to recreate the tables with V3-compatible schemas, but they will remain empty. The tables exist in case per-game box scores are ever needed in the future.

**Season range narrowed to 2023-2025** (3 seasons). For a portfolio project, 2-3 seasons of rich shot chart and play-by-play data is more than enough. Historical expansion to 2010+ can happen later if desired.

### Running on Mac Mini
- **Location:** `~/ingestion-hoopstack/ingestion/` on Mac Mini (192.168.1.18)
- **Command:** `python run_backfill.py --start 2023 --end 2025 --tier game`
- **Process:** Running via `nohup` (check with `ps aux | grep run_backfill`)
- **Log:** `~/ingestion-hoopstack/ingestion/backfill.log`
- **Rate limit delay:** 5.0 seconds (bumped from 3.0 after sustained throttling during 2025-26 ingestion)

### Data Loaded (as of 2026-03-03) — GAME TIER COMPLETE
| Table | Rows (approx) | Seasons | Notes |
|-------|--------------|---------|-------|
| `raw.shot_chart_detail` | ~560k+ | 2023-24 ✅, 2024-25 ✅, 2025-26 ✅ | All 3 seasons complete |
| `raw.play_by_play` | ~1.16M+ | 2023-24 ✅, 2024-25 ✅, 2025-26 ✅ | All 3 seasons complete |
| `raw.player_game_logs` | 74,809 | All 3 seasons ✅ | |
| `raw.team_game_logs` | 6,968 | All 3 seasons ✅ | |
| `raw.league_dash_player_stats` | 2,111 | All 3 seasons ✅ | |
| `raw.lineup_stats` | 8,318 | All 3 seasons ✅ | |
| `raw.common_player_info` | 530 | ✅ | |
| `raw.team_details` | 30 | ✅ | |
| `raw.draft_history` | 8,235 | ✅ | |
| `raw.box_score_*` | 0 | — | Dropped from scope (see above) |

Row counts for shots and PBP are approximate (estimated from ingestion logs). Run the DB check query below to get exact counts.

### Backfill Complete (2026-03-03)
The game tier backfill finished on 2026-03-03 at 08:15. Final run completed in ~4 minutes with 0 errors:
- 2023-24: All shots + PBP ✅ (skipped from checkpoints)
- 2024-25: All shots + PBP ✅ (skipped from checkpoints)
- 2025-26: Shots ✅ (3,292 rows final batch + ~125k from prior runs), PBP ✅ (10,308 rows final batch)
- 6,986 total checkpointed items
- Box scores skipped (commented out in `run_backfill.py`)

### Throttling History
After completing all 2024-25 shot charts (1,230 games) and ~100 PBP games, the NBA API started aggressively throttling. Every subsequent PBP request hit a 30s timeout, burned through 3 retries, and failed.

**Root cause:** ~1,330 consecutive API calls exhausted the rate limit. The code had no cooldown mechanism.

**Fix applied (2026-02-25):**
- Added **consecutive failure cooldown**: after 3 games fail in a row, the process pauses for 5 minutes to let the API rate limit window reset, then resumes. Configurable via `COOLDOWN_THRESHOLD` and `COOLDOWN_SECONDS` in `.env`.
- Added **explicit API timeout**: 60s (up from nba_api default of 30s) via `API_TIMEOUT` in `.env`.
- Changes applied to all three per-game ingestors (shots, PBP, box scores).

**2025-26 throttling (2026-03-02):**
During the 2025-26 shots ingestion, sustained throttling kicked in around game 500/906. Even the 5-minute cooldown wasn't enough — the API continued timing out after recovery attempts. Multiple restart attempts over 4+ hours (with 1-hour waits between) still hit throttling. **Resolution:** bumped `REQUEST_DELAY` from 3.0 to 5.0 seconds and ran overnight when API traffic was lower. The final run the next morning (2026-03-03 08:12) completed with 0 errors in ~4 minutes.

### Issues Hit & Fixed
1. **PlayByPlayV2 deprecated:** NBA API no longer returns data for the V2 endpoint (returns empty JSON, causes `KeyError: 'resultSet'`). Fixed by switching to **PlayByPlayV3** in `ingestors/play_by_play.py`.
2. **V3 schema change:** PlayByPlayV3 returns camelCase columns with a different data model (single player per action vs V2's 3-player slots). Recreated `raw.play_by_play` table with V3-compatible columns. Added `_camel_to_snake()` column name converter.
3. **NBA API rate limiting:** After ~600 rapid requests, the API starts timing out on every call. Bumped `REQUEST_DELAY_SECONDS` from 1.5 to 3.0 in `.env`.
4. **Stale checkpoints:** The checkpoint system marks games as "done" even when ingestion returns 0 rows (e.g., from API errors). When restarting after fixing the V3 issue, had to manually clear stale `pbp_*` checkpoint entries while preserving valid `shots_*` entries.
5. **Overly broad retry policy (2026-02-24):** `nba_client.py` was retrying on `Exception` (which includes `KeyError` from malformed API responses). Fixed to only retry on transient network errors (`ConnectionError`, `TimeoutError`, `requests.RequestException`). `KeyError` from malformed responses now propagates immediately instead of wasting 3 retry attempts.
6. **Checkpoint-on-failure bug (2026-02-24):** All three per-game ingestors (shots, pbp, box scores) had try/except blocks inside the `_for_game()` functions that silently returned 0 on error, causing the `_for_season()` loop to checkpoint the game as "done." Moved error handling up to `_for_season()` so that only successful ingestions get checkpointed. Failed games will now be retried on the next run automatically.
7. **No throttle cooldown (2026-02-25):** After ~1,300 API calls the NBA API throttles aggressively (every request times out). The code had no backoff between consecutive failures — it just kept trying the next game immediately, wasting ~2 minutes per game on doomed retries. Added a consecutive failure cooldown: after 3 failures in a row, pauses for 5 minutes (`COOLDOWN_THRESHOLD=3`, `COOLDOWN_SECONDS=300`). Also added explicit `API_TIMEOUT=60` (was relying on nba_api default of 30s).
8. **Box score V3 migration not applied (2026-03-02):** The code was updated to use V3 endpoints (`person_id`, V3 column names) but the migration script `scripts/migrate_box_scores_v3.sql` was never run on the database. Tables still had V2 schema (`player_id`). Every box score insert failed with `column "person_id" does not exist`. Fixed by running the migration script. Moot now since box scores are dropped from scope.
9. **V3 VARCHAR too short (2026-03-02):** After running the V3 migration, `name_i VARCHAR(20)` was too short for some player names. Widened `name_i` and `minutes` to `VARCHAR(50)` and `jersey_num`/`position` to `VARCHAR(20)` across all box score tables. Again moot since box scores are dropped.
10. **Box scores dropped from scope (2026-03-02):** Per-game box scores require 3 API calls per game, causing the NBA API to throttle after ~200 games. `player_game_logs` and `team_game_logs` (loaded via the season tier with no throttling issues) already contain per-game traditional stats and are sufficient for the analytics layer.
11. **Box scores commented out in run_backfill.py (2026-03-02):** The `ingest_box_scores_for_season()` call in `run_game_tier()` was commented out so the game tier only runs shots + PBP. Without this, the backfill would waste hours on doomed box score API calls.
12. **Sustained API throttling during 2025-26 (2026-03-02):** After ~500 shot chart calls for 2025-26, the NBA API throttled hard enough that even 5-minute cooldowns didn't help. Multiple restarts over 4+ hours failed. `REQUEST_DELAY` bumped from 3.0s to 5.0s and the backfill was run overnight when API load was lower. Completed cleanly the next morning.
13. **Stale checkpoint cleanup (2026-03-02):** Ran the checkpoint cleanup script before resuming the backfill. Removed 460 stale PBP checkpoints (from earlier runs where games were checkpointed despite API errors). 4,659 valid checkpoints remained.

### Updated raw.play_by_play Schema (V3)
The table was dropped and recreated with these columns (different from V2):
```
game_id, action_number, clock, period, team_id, team_tricode,
person_id, player_name, player_name_i, x_legacy, y_legacy,
shot_distance, shot_result, is_field_goal, score_home, score_away,
points_total, location, description, action_type, sub_type,
video_available, shot_value, action_id, ingested_at, source
```
Unique constraint: `(game_id, action_number)`

### Verify DB Row Counts
```bash
# Get exact row counts (backfill is done, use this to verify)
psql "host=192.168.1.22 port=5434 dbname=nba_analytics user=nba_admin password=ElephantLoopy!!84" \
  -c "SELECT 'shots' as tbl, COUNT(*) FROM raw.shot_chart_detail UNION ALL SELECT 'pbp', COUNT(*) FROM raw.play_by_play UNION ALL SELECT 'player_game_logs', COUNT(*) FROM raw.player_game_logs UNION ALL SELECT 'team_game_logs', COUNT(*) FROM raw.team_game_logs;"
```

### Stale Checkpoint Cleanup (completed 2026-03-02)
The stale checkpoint cleanup script was run before the final backfill. Removed 460 stale PBP entries. This issue is resolved — the code fix (errors no longer checkpointed) plus the one-time cleanup means checkpoints are now accurate.

### What Comes Next
All ingestion is complete for 2023-2025. dbt staging + analytics layers are complete and validated. FastAPI backend is live with 20 endpoints.
1. **Next:** Phase 2 continued — Next.js/D3.js frontend (shot charts, player dashboards, game flow)
2. **Later:** Set up nightly incremental ingestion (cron/Airflow) for ongoing 2025-26 season games
3. **Later:** Redis caching for expensive API queries, auth if needed
4. **Later (optional):** Historical backfill 2010-2022 if needed for trend analysis features
5. **Later (optional):** Populate `dims.dim_teams` with conference, division, and team colors for richer team data

---

## dbt Project Setup (completed 2026-03-03)

### Environment
- **dbt-core:** 1.11.6, **dbt-postgres:** 1.10.0
- **venv:** `dbt-venv/` in project root (gitignored)
- **Profile:** `~/.dbt/profiles.yml` — password hardcoded (not env var, because `!!` in the password breaks shell `export` even with single quotes)
- **Packages:** dbt_utils 1.3.3

### How to Run
```bash
cd /Users/cameronrezek/Documents/projects/hoopstack/dbt
source ../dbt-venv/bin/activate
dbt run    # create/refresh all views + tables
dbt test   # run all 51 tests
dbt build  # run + test in dependency order
dbt docs generate  # rebuild docs
dbt docs serve     # view docs locally at http://localhost:8080
```

### Key Design Decisions
- **Staging = views** (lightweight, always fresh from raw). Analytics = tables (pre-computed aggregations).
- **Custom `generate_schema_name` macro** ensures models go to `staging` and `analytics` schemas directly (not `staging_staging`).
- **Dedup pattern** on all staging models: `row_number() over (partition by <natural_key> order by ingested_at desc) where rn = 1`
- **PBP score_differential** uses `nullif(score_home, '')::integer` to handle empty strings in V3 VARCHAR columns.
- **Test YAML** uses `arguments:` nesting for generic test params (required by dbt 1.11, avoids deprecation warnings).
- **Game log column names verified** against `information_schema.columns` before writing staging SQL. Confirmed they match the plan (lowercased NBA API column names: `pts`, `fgm`, `wl`, etc.).

### Staging Models (6 views)
| Model | Source | Dedup Key | Rows (approx) |
|-------|--------|-----------|---------------|
| `stg_players` | `common_player_info` | `person_id` | ~530 |
| `stg_shot_charts` | `shot_chart_detail` | `(game_id, game_event_id, player_id)` | ~560k |
| `stg_play_by_play` | `play_by_play` | `(game_id, action_number)` | ~1.16M |
| `stg_player_game_logs` | `player_game_logs` | `(game_id, player_id)` | ~74k |
| `stg_team_game_logs` | `team_game_logs` | `(game_id, team_id)` | ~6.9k |
| `stg_lineup_stats` | `lineup_stats` | `(group_id, season, season_type)` | ~8.3k |

### Analytics Models (4 tables)
| Model | Depends On | Rows | Key Metrics |
|-------|-----------|------|-------------|
| `fct_player_game_advanced` | `stg_player_game_logs`, `stg_team_game_logs` | 74,499 | TS%, eFG%, usage_rate, game_score, pace |
| `agg_shot_quality` | `stg_shot_charts` | 1,905 | pax_per_100_shots, shot_quality_score, shot_making_score |
| `agg_lineup_stats` | `stg_lineup_stats` | 8,318 | four factors, offensive_rating, net_rating_per_100, sample_size_flag |
| `agg_player_rolling_stats` | `fct_player_game_advanced` | 74,499 | rolling 5/10/20g + season-to-date avgs |

### DAG
```
stg_player_game_logs ──┐
                       ├─> fct_player_game_advanced ──> agg_player_rolling_stats
stg_team_game_logs ────┘

stg_shot_charts ──────────> agg_shot_quality

stg_lineup_stats ─────────> agg_lineup_stats
```

### Tests (51 total, all passing)
- Uniqueness: `stg_players.player_id`
- Not-null: key columns on all 10 models
- Accepted values: `shot_value` (2/3), `win_loss` (W/L), `home_away` (home/away/unknown), `sample_size_flag` (very_small/small/moderate/reliable)
- Composite uniqueness (dbt_utils): natural keys on all models with composite keys

---

## FastAPI Backend (completed 2026-03-03)

### Environment
- **Python venv:** `api-venv/` in project root (gitignored)
- **Dependencies:** fastapi 0.135.1, uvicorn 0.41.0, asyncpg 0.31.0, pydantic 2.12.5, pydantic-settings 2.13.1
- **Config:** `api/.env` (DB creds loaded via pydantic-settings; password single-quoted because `!!` breaks shell export)

### How to Run
```bash
cd /Users/cameronrezek/Documents/projects/hoopstack
source api-venv/bin/activate
uvicorn api.main:app --reload --port 8000
# Docs at http://localhost:8000/docs
# Health check at http://localhost:8000/health
```

### Architecture
- **No ORM** — Raw SQL via asyncpg for full transparency and performance
- **asyncpg connection pool** — min 2, max 10 connections, created/closed via FastAPI lifespan
- **Offset pagination** with `COUNT(*) OVER()` window function (avoids separate count query)
- **CORS** allows `localhost:3000` (for future Next.js frontend)
- **No auth, no Redis, no rate limiting** — those come later per the plan

### Endpoints (20 total)

| Method | Path | Source | Paginated | Notes |
|--------|------|--------|-----------|-------|
| GET | `/health` | analytics/staging tables | No | Row counts + DB status |
| GET | `/players` | `staging.stg_players` | Yes | search, team_id, position filters |
| GET | `/players/{player_id}` | `staging.stg_players` | No | Full player bio |
| GET | `/players/{player_id}/games` | `analytics.fct_player_game_advanced` | Yes | season, season_type filters |
| GET | `/players/{player_id}/shots` | `staging.stg_shot_charts` | Yes | season, season_type, game_id filters |
| GET | `/players/{player_id}/shot-quality` | `analytics.agg_shot_quality` | No | Returns all seasons |
| GET | `/players/{player_id}/rolling` | `analytics.agg_player_rolling_stats` | No | season, season_type filters |
| GET | `/teams` | `raw.team_details` | No | All 30 teams |
| GET | `/teams/{team_id}` | `raw.team_details` | No | Single team |
| GET | `/teams/{team_id}/games` | `staging.stg_team_game_logs` | Yes | season, season_type filters |
| GET | `/teams/{team_id}/lineups` | `analytics.agg_lineup_stats` | Yes | season, season_type, min_minutes |
| GET | `/games/{game_id}` | `staging.stg_team_game_logs` | No | Home/away join for game summary |
| GET | `/games/{game_id}/players` | `analytics.fct_player_game_advanced` | No | All player stats for a game |
| GET | `/games/{game_id}/shots` | `staging.stg_shot_charts` | Yes | period, team_id filters |
| GET | `/games/{game_id}/pbp` | `staging.stg_play_by_play` | Yes | period filter |
| GET | `/shot-quality` | `analytics.agg_shot_quality` | Yes | Leaderboard, sortable, min_shots filter |
| GET | `/lineups` | `analytics.agg_lineup_stats` | Yes | Leaderboard, sortable, min_minutes filter |
| GET | `/rolling` | `analytics.agg_player_rolling_stats` | Yes | player_id, season, team_id filters |
| GET | `/pbp` | `staging.stg_play_by_play` | Yes | game_id, period, player_id, team_id |
| GET | `/seasons` | `analytics.agg_shot_quality` | No | Returns ["2025-26", "2024-25", "2023-24"] |

### Key Design Notes

**Season ID format mismatch:**
- `fct_player_game_advanced`, `agg_player_rolling_stats`, `stg_player_game_logs`, `stg_team_game_logs` use `season_id` in numeric format: "22024" (2=Regular Season), "42024" (4=Playoffs)
- `agg_shot_quality`, `agg_lineup_stats`, `stg_shot_charts` use `season` in human format: "2024-25"
- The API accepts "2024-25" everywhere and converts to `LIKE '%2024'` for tables with numeric `season_id`

**Teams served from raw.team_details (not dims.dim_teams):**
- `dims.dim_teams` exists but is empty (was never populated with conference, division, colors)
- The API falls back to `raw.team_details` which has all 30 teams with nickname, abbreviation, city, arena
- Conference, division, primary_color, secondary_color, logo_url are returned as null
- TODO: Populate `dims.dim_teams` or add a dbt model for teams

### Database Indexes (applied 2026-03-03)
Script: `scripts/add_api_indexes.sql` (8 indexes)
```sql
-- Raw tables (backing staging views)
idx_raw_shots_player_season ON raw.shot_chart_detail (player_id, season)
idx_raw_shots_game          ON raw.shot_chart_detail (game_id)
idx_raw_pbp_game            ON raw.play_by_play (game_id)
-- Analytics tables
idx_fct_pga_player_season   ON analytics.fct_player_game_advanced (player_id, season_id)
idx_fct_pga_game            ON analytics.fct_player_game_advanced (game_id)
idx_rolling_player_season   ON analytics.agg_player_rolling_stats (player_id, season_id)
idx_lineups_team_season     ON analytics.agg_lineup_stats (team_id, season)
idx_shot_quality_player     ON analytics.agg_shot_quality (player_id)
```

### Verified Endpoints (sample responses)
- `GET /health` → `{"status": "healthy", "database": "connected", "row_counts": {...}}`
- `GET /players?search=lebron` → LeBron James (player_id: 2544, LAL)
- `GET /players/2544/games?season=2024-25` → 75 games (Regular Season + Playoffs)
- `GET /players/2544/shots?season=2024-25` → 1,270 shots
- `GET /players/2544/shot-quality` → 3 season entries with PAX metrics
- `GET /teams` → 30 teams
- `GET /games/0022401185` → LAL 140, HOU 109 (2025-04-11)
- `GET /games/0022401185/pbp` → 432 play-by-play events
- `GET /shot-quality?season=2024-25&min_shots=100` → 440 players, sorted by pax_per_100_shots
- `GET /lineups?season=2024-25&min_minutes=200` → 34 lineups
- `GET /seasons` → ["2025-26", "2024-25", "2023-24"]

---

## Ingestion Code Changes (vs original setup doc)
- `ingestors/play_by_play.py` — Now uses `PlayByPlayV3` instead of `PlayByPlayV2`, with `_camel_to_snake()` column conversion
- `.env` — `REQUEST_DELAY_SECONDS` bumped to `3.0`
- `nba_client.py` — Retry policy tightened: only retries on `ConnectionError`, `TimeoutError`, `requests.RequestException`. `KeyError` from malformed API responses is no longer retried (wastes time when rate-limited). Also added `@retry` to `fetch_all_result_sets` (was missing).
- `ingestors/play_by_play.py`, `shot_charts.py`, `box_scores.py` — Error handling moved from `_for_game()` to `_for_season()`. Failed games are NOT checkpointed, so they get retried on the next run instead of being permanently skipped.
- `.env.example` — Default `REQUEST_DELAY_SECONDS` updated to `3.0`
- `ingestors/box_scores.py` — Switched from V2 to V3 endpoints: `BoxScoreTraditionalV3`, `BoxScoreAdvancedV3`, `BoxScoreMiscV3`. V2 endpoints are deprecated by the NBA API as of 2025-26. V3 returns camelCase columns (like PBP V3), added `_camel_to_snake()` conversion. TraditionalV3 returns 3 result sets instead of 2 (new [1]=starter/bench splits, team totals moved to [2]). Conflict columns use `person_id` instead of `player_id` to match V3 naming.
- `scripts/migrate_box_scores_v3.sql` — DDL to drop and recreate all 4 raw box score tables with V3-compatible column names. Tables had 0 rows so no data loss.
- `config.py` — Added `API_TIMEOUT` (default 60s), `COOLDOWN_THRESHOLD` (default 3), `COOLDOWN_SECONDS` (default 300). All configurable via `.env`.
- `nba_client.py` — Now passes `timeout=API_TIMEOUT` to all `nba_api` endpoint constructors (was relying on library default of 30s).
- `ingestors/play_by_play.py`, `shot_charts.py`, `box_scores.py` — Added consecutive failure cooldown: after `COOLDOWN_THRESHOLD` failures in a row, sleeps for `COOLDOWN_SECONDS` to let the NBA API rate limit window reset.
- `.env.example` — Updated with `API_TIMEOUT`, `COOLDOWN_THRESHOLD`, `COOLDOWN_SECONDS` settings.
- `run_backfill.py` — `ingest_box_scores_for_season()` call commented out in `run_game_tier()` (2026-03-02). Game tier now only runs shots + PBP.
- `config.py` — `REQUEST_DELAY` bumped from 3.0 to 5.0 seconds (2026-03-02) to handle sustained NBA API throttling during large ingestion runs.

---

## Environment Details
- **Unraid server:** 192.168.1.22, Unraid OS 7.2.2, 40TB+ storage
- **Dev machine (MacBook):** cameronrezek, `~/Documents/projects/hoopstack/`
- **Mac Mini (backfill runner):** 192.168.1.18, `~/ingestion-hoopstack/ingestion/`, Python 3.14
- **Unraid already running:** 40+ Docker containers, reverse proxy (type unknown), various *arr apps, homepage, etc.
