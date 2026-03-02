#!/usr/bin/env python3
"""
Hoopstack Backfill Runner
=========================

Orchestrates the full historical data load from the NBA Stats API into PostgreSQL.
Supports resumable operation via checkpoints, so you can stop and restart safely.

Usage:
    # Smoke test with recent seasons only
    python run_backfill.py --start 2023 --end 2024

    # Full 15-season backfill (2010-11 through 2024-25)
    python run_backfill.py

    # Only run specific tiers
    python run_backfill.py --tier reference     # teams, players, draft only
    python run_backfill.py --tier season         # game logs + season aggregates
    python run_backfill.py --tier game           # per-game data (shots, pbp, box scores)

    # Reset checkpoints and start fresh
    python run_backfill.py --reset

Tier order matters. The pipeline runs in this sequence:
    1. reference  - Teams, players, draft history (~10 min)
    2. season     - Game logs, lineups, player stats (~30 min for 15 seasons)
    3. game       - Shots, play-by-play, box scores (~several hours)

The game tier is the bottleneck. Each game needs ~5 API calls (shots + pbp +
3 box score types), and there are ~1,300 games per season. With 1.5s delays
between requests, expect roughly:
    - 2 seasons (smoke test): ~3-4 hours
    - 15 seasons (full backfill): ~20-30 hours total

The checkpoint system means you can run this overnight, stop it, and pick up
exactly where you left off.
"""

import argparse
import sys
import time
from datetime import datetime

# Make sure we can import from the ingestion package
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))

from config import all_seasons, CURRENT_SEASON_START, INITIAL_SEASON_START
from db import test_connection
from checkpoint import Checkpoint
from logger import get_logger

from ingestors.reference_data import ingest_all_reference_data
from ingestors.game_logs import ingest_all_game_logs, get_game_ids_for_season
from ingestors.season_stats import ingest_season_stats
from ingestors.shot_charts import ingest_shots_for_season
from ingestors.play_by_play import ingest_pbp_for_season
from ingestors.box_scores import ingest_box_scores_for_season

log = get_logger("backfill")


def run_reference_tier(seasons: list[str]):
    """Tier 1: Reference/dimension data."""
    log.info("=" * 60)
    log.info("TIER 1: Reference Data")
    log.info("=" * 60)
    ingest_all_reference_data(seasons)


def run_season_tier(seasons: list[str]):
    """Tier 2: Season-level data (game logs, aggregates)."""
    log.info("=" * 60)
    log.info("TIER 2: Season-Level Data")
    log.info("=" * 60)
    ingest_all_game_logs(seasons)
    ingest_season_stats(seasons)


def run_game_tier(seasons: list[str]):
    """
    Tier 3: Per-game data (shots, play-by-play, box scores).
    This is the long-running tier. Uses checkpoints for resume.
    """
    log.info("=" * 60)
    log.info("TIER 3: Per-Game Data")
    log.info("=" * 60)

    ckpt = Checkpoint("game_tier")

    for season in seasons:
        log.info(f"\n--- Processing season: {season} ---")

        # Get game IDs from already-ingested game logs
        game_ids = get_game_ids_for_season(season)
        if not game_ids:
            log.warning(f"No game IDs found for {season}. Run the season tier first.")
            continue

        log.info(f"Found {len(game_ids)} games for {season}")

        # Shot charts
        ingest_shots_for_season(season, game_ids, checkpoint=ckpt)

        # Play-by-play
        ingest_pbp_for_season(season, game_ids, checkpoint=ckpt)

        # Box scores dropped from scope (NBA API throttles too aggressively)
        # ingest_box_scores_for_season(season, game_ids, checkpoint=ckpt)

    log.info(f"Game tier complete. {ckpt.completed_count} total checkpointed items.")


def main():
    parser = argparse.ArgumentParser(
        description="Hoopstack NBA data backfill",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_backfill.py --start 2023 --end 2024    # Smoke test
  python run_backfill.py                             # Full backfill
  python run_backfill.py --tier season               # Season data only
  python run_backfill.py --reset                     # Clear checkpoints
        """,
    )
    parser.add_argument(
        "--start",
        type=int,
        default=INITIAL_SEASON_START,
        help=f"Start year (default: {INITIAL_SEASON_START}, i.e. {INITIAL_SEASON_START}-{str(INITIAL_SEASON_START+1)[-2:]} season)",
    )
    parser.add_argument(
        "--end",
        type=int,
        default=CURRENT_SEASON_START,
        help=f"End year (default: {CURRENT_SEASON_START}, i.e. {CURRENT_SEASON_START}-{str(CURRENT_SEASON_START+1)[-2:]} season)",
    )
    parser.add_argument(
        "--tier",
        choices=["reference", "season", "game", "all"],
        default="all",
        help="Which tier to run (default: all)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset all checkpoints before running",
    )

    args = parser.parse_args()

    # Build season list
    seasons = all_seasons(args.start, args.end)
    log.info(f"Target seasons: {seasons[0]} through {seasons[-1]} ({len(seasons)} seasons)")

    # Test database connection
    if not test_connection():
        log.error("Cannot connect to database. Check your .env settings.")
        sys.exit(1)

    # Reset checkpoints if requested
    if args.reset:
        log.warning("Resetting all checkpoints")
        Checkpoint("game_tier").reset()

    start_time = time.time()

    # Run the requested tiers
    try:
        if args.tier in ("reference", "all"):
            run_reference_tier(seasons)

        if args.tier in ("season", "all"):
            run_season_tier(seasons)

        if args.tier in ("game", "all"):
            run_game_tier(seasons)

    except KeyboardInterrupt:
        log.info("\nInterrupted by user. Progress has been checkpointed.")
        log.info("Run again to resume from where you left off.")
        sys.exit(0)

    elapsed = time.time() - start_time
    hours = elapsed / 3600
    log.info(f"\nBackfill complete in {hours:.1f} hours ({elapsed:.0f} seconds)")


if __name__ == "__main__":
    main()
