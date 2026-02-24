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
- [x] Week 1-2: Write Python ingestion scripts — DONE
- [x] Week 1-2: Ingestion code deployed to Mac Mini for long-running backfill
- [ ] Week 1-2: Smoke test backfill (2023-2025) — **IN PROGRESS** (see below)
- [ ] Week 1-2: Full historical backfill 2010-11 through present
- [ ] Week 1: Initialize dbt project with source definitions — NOT STARTED
- [ ] Week 1-2: Set up Airflow/Dagster/cron for nightly ingestion
- [ ] Week 2-3: Build dbt staging models
- [ ] Week 2-3: Build dbt analytics models
- [ ] Week 2-3: Write dbt tests
- [ ] Week 2-3: Generate dbt docs

---

## Current Backfill Status (as of 2026-02-24)

### Running on Mac Mini
- **Location:** `~/ingestion-hoopstack/ingestion/` on Mac Mini (192.168.1.18)
- **Command:** `python run_backfill.py --start 2023 --end 2025 --tier game`
- **Process:** Running via `nohup` (check with `ps aux | grep run_backfill`)
- **Log:** `~/ingestion-hoopstack/ingestion/backfill.log`
- **Rate limit delay:** 3.0 seconds (bumped from 1.5 to avoid NBA API throttling)

### Data Loaded So Far (2023-24 season, game tier)
| Table | Rows | Games | Notes |
|-------|------|-------|-------|
| `raw.shot_chart_detail` | ~215,000 | 1,213 of 1,230 | Nearly complete for 2023-24 |
| `raw.play_by_play` | ~42,000 | ~91 | In progress, working correctly now |
| `raw.box_score_*` | 0 | 0 | Not started yet (runs after pbp) |

### Issues Hit & Fixed
1. **PlayByPlayV2 deprecated:** NBA API no longer returns data for the V2 endpoint (returns empty JSON, causes `KeyError: 'resultSet'`). Fixed by switching to **PlayByPlayV3** in `ingestors/play_by_play.py`.
2. **V3 schema change:** PlayByPlayV3 returns camelCase columns with a different data model (single player per action vs V2's 3-player slots). Recreated `raw.play_by_play` table with V3-compatible columns. Added `_camel_to_snake()` column name converter.
3. **NBA API rate limiting:** After ~600 rapid requests, the API starts timing out on every call. Bumped `REQUEST_DELAY_SECONDS` from 1.5 to 3.0 in `.env`.
4. **Stale checkpoints:** The checkpoint system marks games as "done" even when ingestion returns 0 rows (e.g., from API errors). When restarting after fixing the V3 issue, had to manually clear stale `pbp_*` checkpoint entries while preserving valid `shots_*` entries.

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

### To Resume / Monitor
```bash
# Check if it's still running
ps aux | grep run_backfill

# Watch the log
tail -f ~/ingestion-hoopstack/ingestion/backfill.log

# If it died, restart (it resumes from checkpoints)
cd ~/ingestion-hoopstack/ingestion
source .venv/bin/activate
nohup python run_backfill.py --start 2023 --end 2025 --tier game > backfill.log 2>&1 &

# Check DB progress
psql "host=192.168.1.22 port=5434 dbname=nba_analytics user=nba_admin password=ElephantLoopy!!84" \
  -c "SELECT 'shots' as tbl, COUNT(*) FROM raw.shot_chart_detail UNION ALL SELECT 'pbp', COUNT(*) FROM raw.play_by_play;"
```

### Known Issue: Stale Checkpoints on Failure
If the process gets rate-limited and fails a bunch of games, those games still get checkpointed as "done" with 0 rows. If you need to re-run failed games, clear the stale checkpoints:
```python
cd ~/ingestion-hoopstack/ingestion && source .venv/bin/activate
python -c "
import json
from db import get_conn
with get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT DISTINCT game_id FROM raw.play_by_play')
        real_games = {row[0] for row in cur.fetchall()}
with open('checkpoints/game_tier.json') as f:
    data = json.load(f)
data['completed'] = [x for x in data['completed'] if not x.startswith('pbp_') or x.replace('pbp_', '') in real_games]
with open('checkpoints/game_tier.json', 'w') as f:
    json.dump(data, f, indent=2)
print('Cleaned stale pbp checkpoints')
"
```

### What Comes After the 2023-2025 Game Tier
1. Verify all data landed for 2023-24, 2024-25, 2025-26 seasons
2. Run the full historical backfill: `python run_backfill.py --start 2010 --end 2022 --tier game`
3. Also need to run reference + season tiers for the full range
4. Then: dbt project setup, staging models, analytics models

---

## Ingestion Code Changes (vs original setup doc)
- `ingestors/play_by_play.py` — Now uses `PlayByPlayV3` instead of `PlayByPlayV2`, with `_camel_to_snake()` column conversion
- `.env` — `REQUEST_DELAY_SECONDS` bumped to `3.0`
- The main repo copy (`~/Documents/projects/hoopstack/ingestion/`) has been updated with both changes
- The Mac Mini copy (`~/ingestion-hoopstack/ingestion/`) also has both changes

---

## Environment Details
- **Unraid server:** 192.168.1.22, Unraid OS 7.2.2, 40TB+ storage
- **Dev machine (MacBook):** cameronrezek, `~/Documents/projects/hoopstack/`
- **Mac Mini (backfill runner):** 192.168.1.18, `~/ingestion-hoopstack/ingestion/`, Python 3.14
- **Unraid already running:** 40+ Docker containers, reverse proxy (type unknown), various *arr apps, homepage, etc.
