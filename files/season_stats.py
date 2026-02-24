"""
Ingest season-level aggregate stats: lineup combinations and player dashboard stats.
These endpoints return full-season aggregates, so one API call per season.
"""

import pandas as pd
from nba_api.stats.endpoints import LeagueDashLineups, LeagueDashPlayerStats

from nba_client import fetch_endpoint
from db import delete_and_insert
from config import SEASON_TYPE_REGULAR, SEASON_TYPE_PLAYOFFS
from logger import get_logger

log = get_logger("ingest.season_stats")


def ingest_lineups_for_season(
    season: str,
    season_type: str = SEASON_TYPE_REGULAR,
    group_quantity: int = 5,
):
    """
    Pull lineup combination stats for a season.
    group_quantity=5 gives 5-man lineups (the standard).
    The API also supports 2, 3, 4 for smaller combination analysis.
    """
    log.info(f"Ingesting lineups: {season} ({season_type}), {group_quantity}-man units")

    try:
        df = fetch_endpoint(
            LeagueDashLineups,
            result_set_index=0,
            season=season,
            season_type_all_star=season_type,
            group_quantity=group_quantity,
            measure_type_detailed_defense="Base",
            per_mode_detailed="PerGame",
        )

        if df.empty:
            log.warning(f"  No lineup data for {season}")
            return

        df.columns = [c.lower() for c in df.columns]
        df["season"] = season
        df["season_type"] = season_type
        df["group_quantity"] = group_quantity

        rows = delete_and_insert(
            df,
            "raw.lineup_stats",
            partition_columns={"season": season, "season_type": season_type},
        )
        log.info(f"  Lineups: {rows} rows")

    except Exception as e:
        log.error(f"Lineup ingestion failed for {season}: {e}")


def ingest_player_stats_for_season(
    season: str,
    season_type: str = SEASON_TYPE_REGULAR,
):
    """
    Pull season aggregate player stats from LeagueDashPlayerStats.
    This gives per-game averages and totals for all players in a season.
    """
    log.info(f"Ingesting player dash stats: {season} ({season_type})")

    try:
        df = fetch_endpoint(
            LeagueDashPlayerStats,
            result_set_index=0,
            season=season,
            season_type_all_star=season_type,
            per_mode_detailed="PerGame",
            measure_type_detailed_defense="Base",
        )

        if df.empty:
            log.warning(f"  No player stats for {season}")
            return

        df.columns = [c.lower() for c in df.columns]
        df["season"] = season
        df["season_type"] = season_type

        rows = delete_and_insert(
            df,
            "raw.league_dash_player_stats",
            partition_columns={"season": season, "season_type": season_type},
        )
        log.info(f"  Player stats: {rows} rows")

    except Exception as e:
        log.error(f"Player stats failed for {season}: {e}")


def ingest_season_stats(seasons: list[str]):
    """Ingest all season-level aggregates for the given seasons."""
    log.info(f"=== Ingesting season-level stats for {len(seasons)} seasons ===")

    for season in seasons:
        # Regular season
        ingest_lineups_for_season(season, SEASON_TYPE_REGULAR)
        ingest_player_stats_for_season(season, SEASON_TYPE_REGULAR)

        # Playoffs
        ingest_lineups_for_season(season, SEASON_TYPE_PLAYOFFS)
        ingest_player_stats_for_season(season, SEASON_TYPE_PLAYOFFS)

    log.info("=== Season-level stats ingestion complete ===")
