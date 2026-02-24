"""
Ingest play-by-play data for individual games.
"""

import pandas as pd
from nba_api.stats.endpoints import PlayByPlayV2

from nba_client import fetch_endpoint
from db import bulk_insert
from checkpoint import Checkpoint
from logger import get_logger

log = get_logger("ingest.pbp")


def ingest_pbp_for_game(game_id: str) -> int:
    """Pull full play-by-play for a single game."""
    try:
        df = fetch_endpoint(
            PlayByPlayV2,
            result_set_index=0,
            game_id=game_id,
        )

        if df.empty:
            return 0

        df.columns = [c.lower() for c in df.columns]

        rows = bulk_insert(
            df,
            "raw.play_by_play",
            conflict_columns=["game_id", "eventnum"],
        )
        return rows

    except Exception as e:
        log.error(f"Play-by-play failed for game {game_id}: {e}")
        return 0


def ingest_pbp_for_season(
    season: str,
    game_ids: list[str],
    checkpoint: Checkpoint | None = None,
):
    """
    Ingest play-by-play for all games in a season.
    This is one of the most API-call-intensive operations since
    each game requires its own request.
    """
    log.info(f"Ingesting play-by-play: {season} ({len(game_ids)} games)")

    total_rows = 0
    skipped = 0

    for i, game_id in enumerate(game_ids):
        ckpt_key = f"pbp_{game_id}"

        if checkpoint and checkpoint.is_done(ckpt_key):
            skipped += 1
            continue

        rows = ingest_pbp_for_game(game_id)
        total_rows += rows

        if checkpoint:
            checkpoint.mark_done(ckpt_key)

        if (i + 1) % 100 == 0:
            log.info(f"  Progress: {i + 1}/{len(game_ids)} games, {total_rows} total rows")

    log.info(
        f"  Play-by-play for {season}: {total_rows} rows loaded, {skipped} skipped"
    )
