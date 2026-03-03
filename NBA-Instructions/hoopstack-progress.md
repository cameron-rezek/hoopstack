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

### Staging Views Created by dbt (2026-03-03)
5 views in the `staging` schema, created via `dbt run`:
- `staging.stg_players` — deduplicated from `raw.common_player_info`
- `staging.stg_shot_charts` — from `raw.shot_chart_detail`, adds computed `distance_feet`, `shot_angle`, `game_minutes_elapsed`, `is_location_reliable`, `shot_value`
- `staging.stg_play_by_play` — from `raw.play_by_play` (V3), adds `score_differential`, renames `person_id` -> `player_id`
- `staging.stg_player_game_logs` — from `raw.player_game_logs`, renames abbreviated columns to readable names, adds `home_away`
- `staging.stg_team_game_logs` — from `raw.team_game_logs`, same pattern as player game logs

All staging models use dedup pattern: `row_number() over (partition by <natural_key> order by ingested_at desc) where rn = 1`

28 dbt tests defined and passing (unique, not_null, accepted_values, unique_combination_of_columns).

### Analytics Tables
Not yet created — these will be built by dbt analytics models (next phase).

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
│   │   ├── staging/        # 5 staging models + sources/tests YAML
│   │   └── analytics/      # placeholder, models TBD
│   ├── seeds/
│   ├── snapshots/
│   ├── tests/
│   └── analyses/
├── dbt-venv/               # Python venv for dbt (gitignored)
├── api/                    # FastAPI (Phase 2)
├── frontend/               # Next.js + D3.js (Phase 2)
├── scripts/                # Utility scripts, backfills
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

**Phase 1: Data Foundation (2-3 weeks)**

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
- [x] Week 2-3: Build dbt staging models — DONE (2026-03-03, 5 views in staging schema)
- [x] Week 2-3: Write dbt tests — DONE (2026-03-03, 28 tests all passing)
- [x] Week 2-3: Generate dbt docs — DONE (2026-03-03, catalog + lineage graph)
- [ ] Week 2-3: Build dbt analytics models — **NEXT UP**
- [ ] Week 1-2: Set up Airflow/Dagster/cron for nightly ingestion

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
All ingestion is complete for 2023-2025. dbt staging layer is complete and validated.
1. **Next:** Build dbt analytics (gold) models — `fct_player_game_advanced`, `agg_shot_expected_value`, `agg_lineup_stats`, `agg_player_rolling_stats`
2. **Later:** Set up nightly incremental ingestion (cron/Airflow) for ongoing 2025-26 season games
3. **Later (optional):** Historical backfill 2010-2022 if needed for trend analysis features

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
dbt run    # create/refresh staging views
dbt test   # run all 28 tests
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

### Staging Models
| Model | Source | Dedup Key | Rows (approx) |
|-------|--------|-----------|---------------|
| `stg_players` | `common_player_info` | `person_id` | ~530 |
| `stg_shot_charts` | `shot_chart_detail` | `(game_id, game_event_id, player_id)` | ~560k |
| `stg_play_by_play` | `play_by_play` | `(game_id, action_number)` | ~1.16M |
| `stg_player_game_logs` | `player_game_logs` | `(game_id, player_id)` | ~74k |
| `stg_team_game_logs` | `team_game_logs` | `(game_id, team_id)` | ~6.9k |

### Tests (28 total, all passing)
- Uniqueness: `stg_players.player_id`
- Not-null: key columns on all 5 models
- Accepted values: `shot_value` (2/3), `win_loss` (W/L), `home_away` (home/away/unknown)
- Composite uniqueness (dbt_utils): natural keys on shot_charts, play_by_play, player_game_logs, team_game_logs

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
