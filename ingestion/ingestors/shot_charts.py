"""
Ingest shot chart detail data.
Pulls all shots for each game using player_id=0 (all players).
"""

import pandas as pd
from nba_api.stats.endpoints import ShotChartDetail

from nba_client import fetch_endpoint
from db import bulk_insert, get_existing_game_ids
from checkpoint import Checkpoint
from config import SEASON_TYPE_REGULAR, SEASON_TYPE_PLAYOFFS
from logger import get_logger

log = get_logger("ingest.shots")


def ingest_shots_for_game(game_id: str, season: str, season_type: str = SEASON_TYPE_REGULAR) -> int:
    """
    Pull all shot chart data for a single game.
    Using player_id=0 and team_id=0 returns all shots for the game.
    Raises on error so the caller can skip checkpointing.
    """
    df = fetch_endpoint(
        ShotChartDetail,
        result_set_index=0,
        player_id=0,
        team_id=0,
        game_id_nullable=game_id,
        season_nullable=season,
        season_type_all_star=season_type,
        context_measure_simple="FGA",
    )

    if df.empty:
        return 0

    df.columns = [c.lower() for c in df.columns]

    # Add season info if not present
    if "season" not in df.columns:
        df["season"] = season
    if "season_type" not in df.columns:
        df["season_type"] = season_type

    rows = bulk_insert(
        df,
        "raw.shot_chart_detail",
        conflict_columns=["game_id", "game_event_id", "player_id"],
    )
    return rows


def ingest_shots_for_season(
    season: str,
    game_ids: list[str],
    season_type: str = SEASON_TYPE_REGULAR,
    checkpoint: Checkpoint | None = None,
):
    """
    Ingest shot charts for all games in a season.
    Skips games already in the checkpoint.
    """
    log.info(f"Ingesting shot charts: {season} ({len(game_ids)} games)")

    total_rows = 0
    skipped = 0
    errors = 0

    for i, game_id in enumerate(game_ids):
        ckpt_key = f"shots_{game_id}"

        if checkpoint and checkpoint.is_done(ckpt_key):
            skipped += 1
            continue

        try:
            rows = ingest_shots_for_game(game_id, season, season_type)
            total_rows += rows

            if checkpoint:
                checkpoint.mark_done(ckpt_key)
        except Exception as e:
            log.error(f"Shot chart failed for game {game_id}: {e}")
            errors += 1

        if (i + 1) % 100 == 0:
            log.info(f"  Progress: {i + 1}/{len(game_ids)} games, {total_rows} total rows, {errors} errors")

    log.info(
        f"  Shot charts for {season}: {total_rows} rows loaded, {skipped} skipped, {errors} errors"
    )
