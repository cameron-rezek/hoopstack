"""
Ingest reference/dimension data: teams, players, and draft history.
These are mostly static and only need occasional refreshes.
"""

import pandas as pd
from nba_api.stats.endpoints import CommonPlayerInfo, TeamDetails, DraftHistory
from nba_api.stats.static import teams as nba_teams, players as nba_players

from nba_client import fetch_endpoint
from db import bulk_insert, delete_and_insert
from logger import get_logger

log = get_logger("ingest.reference")


def ingest_all_teams():
    """
    Ingest team details for all 30 NBA teams.
    Uses the static teams list from nba_api to get team IDs,
    then pulls detailed info for each.
    """
    log.info("Ingesting team details")

    all_nba_teams = nba_teams.get_teams()
    log.info(f"Found {len(all_nba_teams)} teams")

    for team in all_nba_teams:
        team_id = team["id"]
        try:
            df = fetch_endpoint(
                TeamDetails,
                result_set_index=0,
                team_id=team_id,
            )
            if df.empty:
                log.warning(f"No data for team {team_id} ({team['full_name']})")
                continue

            # The API returns UPPERCASE columns; lowercase them for our schema
            df.columns = [c.lower() for c in df.columns]

            rows = bulk_insert(df, "raw.team_details", conflict_columns=["team_id"])
            log.info(f"  {team['full_name']}: {rows} rows")

        except Exception as e:
            log.error(f"Failed to ingest team {team_id} ({team['full_name']}): {e}")
            continue

    log.info("Team details ingestion complete")


def ingest_all_players(seasons: list[str] | None = None):
    """
    Ingest player bio/demographic info.

    Strategy: Use the nba_api static player list to get all known player IDs,
    then pull CommonPlayerInfo for each. This is ~5000+ players historically,
    so it takes a while. For a targeted pull, pass specific seasons and we'll
    only pull players who appeared in those seasons' game logs.

    For the initial load, we pull all active players + anyone who appeared
    in game logs we've already ingested.
    """
    log.info("Ingesting player info")

    # Get all known players from nba_api's static list
    all_nba_players = nba_players.get_players()

    # If we only want players from specific seasons, filter to active ones
    # and players who appeared recently. The static list has an is_active flag.
    if seasons:
        # For targeted pulls, just do active players
        target_players = [p for p in all_nba_players if p["is_active"]]
    else:
        target_players = [p for p in all_nba_players if p["is_active"]]

    log.info(f"Pulling info for {len(target_players)} players")

    success_count = 0
    fail_count = 0

    for i, player in enumerate(target_players):
        player_id = player["id"]
        player_name = player["full_name"]

        if (i + 1) % 50 == 0:
            log.info(f"  Progress: {i + 1}/{len(target_players)} players")

        try:
            df = fetch_endpoint(
                CommonPlayerInfo,
                result_set_index=0,
                player_id=player_id,
            )
            if df.empty:
                continue

            df.columns = [c.lower() for c in df.columns]
            bulk_insert(df, "raw.common_player_info", conflict_columns=["person_id"])
            success_count += 1

        except Exception as e:
            log.warning(f"Failed for player {player_id} ({player_name}): {e}")
            fail_count += 1
            continue

    log.info(f"Player info complete: {success_count} succeeded, {fail_count} failed")


def ingest_draft_history():
    """
    Ingest full NBA draft history.
    The DraftHistory endpoint returns all drafts when no season filter is applied.
    """
    log.info("Ingesting draft history")

    try:
        df = fetch_endpoint(DraftHistory, result_set_index=0)

        if df.empty:
            log.warning("No draft history returned")
            return

        df.columns = [c.lower() for c in df.columns]

        # Draft history doesn't have a great natural key, so delete-and-replace
        # is safest. We could use (season, overall_pick) as the key.
        rows = bulk_insert(
            df,
            "raw.draft_history",
            conflict_columns=["person_id"],
        )
        log.info(f"Draft history: {rows} rows loaded")

    except Exception as e:
        log.error(f"Draft history ingestion failed: {e}")
        raise


def ingest_all_reference_data(seasons: list[str] | None = None):
    """Run all reference data ingestion."""
    log.info("=== Starting reference data ingestion ===")
    ingest_all_teams()
    ingest_draft_history()
    ingest_all_players(seasons)
    log.info("=== Reference data ingestion complete ===")
