"""
Ingest box score data (traditional, advanced, misc) for individual games.
Uses V3 endpoints (V2 deprecated by NBA API as of 2025-26 season).
Each box score endpoint returns player-level and team-level result sets.
"""

import re
import time

import pandas as pd
from nba_api.stats.endpoints import (
    BoxScoreAdvancedV3,
    BoxScoreMiscV3,
    BoxScoreTraditionalV3,
)

from checkpoint import Checkpoint
from config import COOLDOWN_SECONDS, COOLDOWN_THRESHOLD
from db import bulk_insert
from logger import get_logger
from nba_client import fetch_all_result_sets

log = get_logger("ingest.boxscores")


def _camel_to_snake(name: str) -> str:
    """Convert camelCase column names to snake_case."""
    s1 = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)
    return re.sub(r"([a-z\d])([A-Z])", r"\1_\2", s1).lower()


def _convert_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Convert V3 camelCase columns to snake_case."""
    df.columns = [_camel_to_snake(c) for c in df.columns]
    return df


def ingest_box_traditional_for_game(game_id: str) -> tuple[int, int]:
    """
    Pull traditional box score for a game.
    Returns (player_rows, team_rows).
    Raises on error so the caller can skip checkpointing.

    BoxScoreTraditionalV3 result sets:
      [0] = PlayerStats (player-level)
      [1] = StarterBenchStats (starter/bench splits — skipped)
      [2] = TeamStats (team totals)
    """
    result_sets = fetch_all_result_sets(
        BoxScoreTraditionalV3,
        game_id=game_id,
    )

    player_rows = 0
    team_rows = 0

    if len(result_sets) > 0 and not result_sets[0].empty:
        df = _convert_columns(result_sets[0])
        player_rows = bulk_insert(
            df,
            "raw.box_score_traditional",
            conflict_columns=["game_id", "person_id"],
        )

    if len(result_sets) > 2 and not result_sets[2].empty:
        df = _convert_columns(result_sets[2])
        team_rows = bulk_insert(
            df,
            "raw.box_score_team_traditional",
            conflict_columns=["game_id", "team_id"],
        )

    return player_rows, team_rows


def ingest_box_advanced_for_game(game_id: str) -> int:
    """
    Pull advanced box score for a game.
    Raises on error so the caller can skip checkpointing.

    BoxScoreAdvancedV3 result sets:
      [0] = PlayerStats
      [1] = TeamStats
    """
    result_sets = fetch_all_result_sets(
        BoxScoreAdvancedV3,
        game_id=game_id,
    )

    if not result_sets or result_sets[0].empty:
        return 0

    df = _convert_columns(result_sets[0])
    rows = bulk_insert(
        df,
        "raw.box_score_advanced",
        conflict_columns=["game_id", "person_id"],
    )
    return rows


def ingest_box_misc_for_game(game_id: str) -> int:
    """
    Pull misc box score for a game (second chance pts, fast break, etc.).
    Raises on error so the caller can skip checkpointing.

    BoxScoreMiscV3 result sets:
      [0] = PlayerStats
      [1] = TeamStats
    """
    result_sets = fetch_all_result_sets(
        BoxScoreMiscV3,
        game_id=game_id,
    )

    if not result_sets or result_sets[0].empty:
        return 0

    df = _convert_columns(result_sets[0])
    rows = bulk_insert(
        df,
        "raw.box_score_misc",
        conflict_columns=["game_id", "person_id"],
    )
    return rows


def ingest_all_box_scores_for_game(game_id: str) -> dict:
    """
    Pull all three box score types for a single game. Returns row counts.
    Raises on error so the caller can skip checkpointing.
    """
    trad_player, trad_team = ingest_box_traditional_for_game(game_id)
    adv = ingest_box_advanced_for_game(game_id)
    misc = ingest_box_misc_for_game(game_id)

    return {
        "traditional_player": trad_player,
        "traditional_team": trad_team,
        "advanced": adv,
        "misc": misc,
    }


def ingest_box_scores_for_season(
    season: str,
    game_ids: list[str],
    checkpoint: Checkpoint | None = None,
):
    """
    Ingest all box scores for all games in a season.
    Each game requires 3 API calls (traditional, advanced, misc).
    """
    log.info(f"Ingesting box scores: {season} ({len(game_ids)} games, 3 calls each)")

    total = {"traditional_player": 0, "traditional_team": 0, "advanced": 0, "misc": 0}
    skipped = 0
    errors = 0
    consecutive_failures = 0

    for i, game_id in enumerate(game_ids):
        ckpt_key = f"box_{game_id}"

        if checkpoint and checkpoint.is_done(ckpt_key):
            skipped += 1
            continue

        try:
            counts = ingest_all_box_scores_for_game(game_id)
            for k, v in counts.items():
                total[k] += v
            consecutive_failures = 0

            if checkpoint:
                checkpoint.mark_done(ckpt_key)
        except Exception as e:
            log.error(f"Box scores failed for game {game_id}: {e}")
            errors += 1
            consecutive_failures += 1

            if consecutive_failures >= COOLDOWN_THRESHOLD:
                log.warning(
                    f"  {consecutive_failures} consecutive failures — "
                    f"cooling down for {COOLDOWN_SECONDS}s to let API throttle reset"
                )
                time.sleep(COOLDOWN_SECONDS)
                consecutive_failures = 0

        if (i + 1) % 100 == 0:
            log.info(f"  Progress: {i + 1}/{len(game_ids)} games, {errors} errors")

    log.info(f"  Box scores for {season}: {total}, {skipped} skipped, {errors} errors")
