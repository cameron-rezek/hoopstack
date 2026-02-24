#!/usr/bin/env python3
"""
Hoopstack Daily Ingestion
=========================

Pulls yesterday's games and refreshes season-level aggregates.
Designed to run as a nightly cron job or Airflow task during the NBA season.

Usage:
    python run_daily.py                    # Ingest yesterday's games
    python run_daily.py --date 2024-12-25  # Ingest games from a specific date
    python run_daily.py --refresh-season   # Also refresh season-level aggregates

Cron example (run at 6am daily during season):
    0 6 * * * cd /path/to/hoopstack/ingestion && python run_daily.py --refresh-season
"""

import argparse
import sys
from datetime import datetime, timedelta

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))

from config import season_string, CURRENT_SEASON_START, SEASON_TYPE_REGULAR
from db import test_connection, get_conn
from logger import get_logger

from ingestors.game_logs import ingest_game_logs_for_season
from ingestors.shot_charts import ingest_shots_for_game
from ingestors.play_by_play import ingest_pbp_for_game
from ingestors.box_scores import ingest_all_box_scores_for_game
from ingestors.season_stats import ingest_lineups_for_season, ingest_player_stats_for_season

log = get_logger("daily")


def get_games_for_date(target_date: str) -> list[str]:
    """
    Get game IDs for a specific date from the team game logs table.
    We refresh game logs first, then query for the target date.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT game_id
                FROM raw.team_game_logs
                WHERE game_date = %s
                ORDER BY game_id
                """,
                (target_date,),
            )
            return [row[0] for row in cur.fetchall()]


def main():
    parser = argparse.ArgumentParser(description="Hoopstack daily ingestion")
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Target date (YYYY-MM-DD). Defaults to yesterday.",
    )
    parser.add_argument(
        "--refresh-season",
        action="store_true",
        help="Also refresh season-level aggregates (lineups, player stats)",
    )

    args = parser.parse_args()

    if args.date:
        target_date = args.date
    else:
        target_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    # Determine which season this date falls in
    target_dt = datetime.strptime(target_date, "%Y-%m-%d")
    # NBA season starts in October: if month >= 10, it's the current year's season
    # If month < 10, it's the previous year's season
    if target_dt.month >= 10:
        season_start_year = target_dt.year
    else:
        season_start_year = target_dt.year - 1
    season = season_string(season_start_year)

    log.info(f"Daily ingestion for {target_date} (season {season})")

    if not test_connection():
        log.error("Cannot connect to database")
        sys.exit(1)

    # Step 1: Refresh game logs for the current season so we have today's games
    log.info("Refreshing game logs...")
    ingest_game_logs_for_season(season, SEASON_TYPE_REGULAR)

    # Step 2: Find games on the target date
    game_ids = get_games_for_date(target_date)

    if not game_ids:
        log.info(f"No games found on {target_date}. Nothing to do.")
    else:
        log.info(f"Found {len(game_ids)} games on {target_date}")

        # Step 3: Ingest per-game data for each game
        for game_id in game_ids:
            log.info(f"Processing game {game_id}")
            ingest_shots_for_game(game_id, season)
            ingest_pbp_for_game(game_id)
            ingest_all_box_scores_for_game(game_id)

    # Step 4: Optionally refresh season-level aggregates
    if args.refresh_season:
        log.info("Refreshing season-level aggregates...")
        ingest_lineups_for_season(season, SEASON_TYPE_REGULAR)
        ingest_player_stats_for_season(season, SEASON_TYPE_REGULAR)

    log.info("Daily ingestion complete")


if __name__ == "__main__":
    main()
