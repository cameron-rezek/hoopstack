"""
Ingest box score data (traditional, advanced, misc) for individual games.
Each box score endpoint returns both player-level and team-level result sets.
"""

import pandas as pd
from nba_api.stats.endpoints import (
    BoxScoreTraditionalV2,
    BoxScoreAdvancedV2,
    BoxScoreMiscV2,
)

from nba_client import fetch_all_result_sets
from db import bulk_insert
from checkpoint import Checkpoint
from logger import get_logger

log = get_logger("ingest.boxscores")


def _safe_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lowercase columns and handle the reserved word 'TO' (turnovers)."""
    df.columns = [c.lower() for c in df.columns]
    # The NBA API returns 'TO' for turnovers which is a SQL reserved word.
    # Our raw tables use quoted "to" columns. The bulk_insert handles quoting.
    return df


def ingest_box_traditional_for_game(game_id: str) -> tuple[int, int]:
    """
    Pull traditional box score for a game.
    Returns (player_rows, team_rows).

    BoxScoreTraditionalV2 result sets:
      [0] = PlayerStats (player-level)
      [1] = TeamStats (team-level)
    """
    try:
        result_sets = fetch_all_result_sets(
            BoxScoreTraditionalV2,
            game_id=game_id,
        )

        player_rows = 0
        team_rows = 0

        if len(result_sets) > 0 and not result_sets[0].empty:
            df = _safe_columns(result_sets[0])
            player_rows = bulk_insert(
                df,
                "raw.box_score_traditional",
                conflict_columns=["game_id", "player_id"],
            )

        if len(result_sets) > 1 and not result_sets[1].empty:
            df = _safe_columns(result_sets[1])
            team_rows = bulk_insert(
                df,
                "raw.box_score_team_traditional",
                conflict_columns=["game_id", "team_id"],
            )

        return player_rows, team_rows

    except Exception as e:
        log.error(f"Box score traditional failed for {game_id}: {e}")
        return 0, 0


def ingest_box_advanced_for_game(game_id: str) -> int:
    """
    Pull advanced box score for a game.

    BoxScoreAdvancedV2 result sets:
      [0] = PlayerStats
      [1] = TeamStats (we store player-level; team-level can be derived)
    """
    try:
        result_sets = fetch_all_result_sets(
            BoxScoreAdvancedV2,
            game_id=game_id,
        )

        if not result_sets or result_sets[0].empty:
            return 0

        df = _safe_columns(result_sets[0])
        rows = bulk_insert(
            df,
            "raw.box_score_advanced",
            conflict_columns=["game_id", "player_id"],
        )
        return rows

    except Exception as e:
        log.error(f"Box score advanced failed for {game_id}: {e}")
        return 0


def ingest_box_misc_for_game(game_id: str) -> int:
    """
    Pull misc box score for a game (second chance pts, fast break, etc.).

    BoxScoreMiscV2 result sets:
      [0] = PlayerStats
    """
    try:
        result_sets = fetch_all_result_sets(
            BoxScoreMiscV2,
            game_id=game_id,
        )

        if not result_sets or result_sets[0].empty:
            return 0

        df = _safe_columns(result_sets[0])
        rows = bulk_insert(
            df,
            "raw.box_score_misc",
            conflict_columns=["game_id", "player_id"],
        )
        return rows

    except Exception as e:
        log.error(f"Box score misc failed for {game_id}: {e}")
        return 0


def ingest_all_box_scores_for_game(game_id: str) -> dict:
    """Pull all three box score types for a single game. Returns row counts."""
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

    for i, game_id in enumerate(game_ids):
        ckpt_key = f"box_{game_id}"

        if checkpoint and checkpoint.is_done(ckpt_key):
            skipped += 1
            continue

        counts = ingest_all_box_scores_for_game(game_id)
        for k, v in counts.items():
            total[k] += v

        if checkpoint:
            checkpoint.mark_done(ckpt_key)

        if (i + 1) % 100 == 0:
            log.info(f"  Progress: {i + 1}/{len(game_ids)} games")

    log.info(f"  Box scores for {season}: {total}, {skipped} games skipped")
