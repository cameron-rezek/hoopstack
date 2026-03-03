# Ingestion Pipeline: Setup & Usage

## File Structure

Drop the entire `ingestion/` folder into `~/Projects/hoopstack/`. Here's what's in it:

```
ingestion/
├── .env.example          # Copy to .env, fill in your DB password
├── requirements.txt      # pip install -r requirements.txt
├── config.py             # Settings, season helpers, loaded from .env
├── db.py                 # Connection pool, bulk upsert, column alignment
├── nba_client.py         # nba_api wrapper with rate limiting + retries (tenacity)
├── checkpoint.py         # JSON-based progress tracking for resumable backfills
├── logger.py             # Console + rotating file logging
├── run_backfill.py       # Main backfill CLI (this is the entry point)
├── run_daily.py          # Nightly incremental ingestion (for cron/Airflow later)
└── ingestors/
    ├── reference_data.py # Teams, players, draft history
    ├── game_logs.py      # LeagueGameFinder (also discovers game IDs)
    ├── shot_charts.py    # ShotChartDetail per game
    ├── play_by_play.py   # PlayByPlayV3 per game (V2 deprecated by NBA API)
    ├── box_scores.py     # Traditional + advanced + misc box scores per game
    └── season_stats.py   # Lineups + player dash stats (season-level)
```

## Getting Started

```bash
cd ~/Projects/hoopstack/ingestion
cp .env.example .env
# Edit .env with actual DB password (ElephantLoopy!!84)

pip install -r requirements.txt
```

## Running the Backfill

The pipeline is split into three tiers. Run them in order:

```bash
# Smoke test first: just 2023-24 and 2024-25 seasons
python run_backfill.py --start 2023 --end 2024 --tier reference
python run_backfill.py --start 2023 --end 2024 --tier season
python run_backfill.py --start 2023 --end 2024 --tier game

# Once validated, full 15-season backfill
python run_backfill.py
```

You can also reset checkpoints and start fresh if needed:

```bash
python run_backfill.py --reset
```

## How the Tiers Break Down

| Tier | What It Pulls | Speed | API Calls |
|------|--------------|-------|-----------|
| `reference` | Teams, players, draft history | ~10 min | ~500 (one per active player + 30 teams) |
| `season` | Game logs, lineups, player aggregate stats | ~30 min for 15 seasons | ~4 per season (regular + playoffs, players + teams) |
| `game` | Shots, play-by-play (box scores removed) | **Several hours** | ~2 per game, ~1,300 games per season |

The game tier is the bottleneck. With 5.0s delays between API calls, expect roughly:
- 3-season backfill: ~6-10 hours (may need overnight run if API throttles)
- Box scores have been removed from the game tier (commented out in `run_backfill.py`) — `player_game_logs` and `team_game_logs` cover box score needs.

## Checkpointing (Resumable Backfills)

This is the key to making the long game tier manageable. You can Ctrl+C at any point, and `run_backfill.py` picks up exactly where it left off next time you run it. Checkpoints are stored as JSON files in `ingestion/checkpoints/`.

Practical workflow: kick off the game tier before bed, stop it in the morning, resume the next night. Repeat until it's done.

## How Column Alignment Works

The `db.py` module auto-aligns DataFrame columns to your raw table schemas at insert time. If the NBA API returns columns your tables don't have (or the other way around), it handles the mismatch gracefully instead of crashing. This matters because `nba_api` response schemas aren't always perfectly documented.

If something looks off during the load, bump `LOG_LEVEL=DEBUG` in your `.env` and check the logs in `ingestion/logs/`. The alignment function logs any column drops or mismatches at the debug level.

## Suggested Order of Operations

1. Copy `.env.example` to `.env`, set your password
2. `pip install -r requirements.txt`
3. Run `reference` tier for the smoke test range (--start 2023 --end 2024) and verify data in pgAdmin
4. Run `season` tier for the same range, verify game logs landed
5. Run `game` tier for the same range, let it chug through the ~2,600 games (best run overnight)
6. Spot check a few games in pgAdmin: shots + PBP present
7. If everything looks clean, expand to full target range (`python run_backfill.py --start 2023 --end 2025 --tier game`)
8. Once backfill is done, the `run_daily.py` script handles nightly incremental pulls

## Nightly Ingestion (Later)

Once the backfill is complete and you're ready to set up Airflow/cron:

```bash
# Run daily at 6am during the season
# Pulls yesterday's games + refreshes season aggregates
python run_daily.py --refresh-season

# Or target a specific date
python run_daily.py --date 2025-01-15
```

Cron example:
```
0 6 * * * cd ~/Projects/hoopstack/ingestion && python run_daily.py --refresh-season >> /tmp/hoopstack-daily.log 2>&1
```

## Things to Watch For

- **Raw table column mismatches**: The API might return columns that don't exist in your raw tables (or your tables might have columns the API doesn't populate). The `align_dataframe_to_table` function handles this, but worth verifying with the smoke test.
- **Rate limiting**: Default delay is now 5.0s (bumped from 3.0 after sustained NBA API throttling during 2025-26 ingestion). Can be adjusted via `REQUEST_DELAY_SECONDS` in `.env`. The NBA API throttles aggressively after ~500-600 rapid calls — running overnight helps.
- **Box scores removed**: Per-game box scores are commented out in `run_backfill.py`. The tables exist with V3 schemas but are empty. `player_game_logs` + `team_game_logs` cover box score needs.
- **Game IDs**: The game tier relies on game IDs from the team_game_logs table. Always run the season tier before the game tier, or the game tier won't know which games to pull.
