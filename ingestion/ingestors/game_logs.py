"""
Ingest game logs via LeagueGameFinder.
This is also the primary way we discover game IDs for per-game endpoints.
Pulls both player-level and team-level game logs.
"""

from nba_api.stats.endpoints import LeagueGameFinder

from config import SEASON_TYPE_PLAYOFFS, SEASON_TYPE_REGULAR
from db import delete_and_insert, get_conn
from logger import get_logger
from nba_client import fetch_endpoint

log = get_logger("ingest.game_logs")


def ingest_game_logs_for_season(season: str, season_type: str = SEASON_TYPE_REGULAR):
    """
    Pull all game logs for a season via LeagueGameFinder.

    LeagueGameFinder returns one row per player per game (player game logs)
    or one row per team per game (team game logs) depending on the
    player_or_team_abbreviation parameter.

    Args:
        season: NBA season string (e.g., '2023-24')
        season_type: 'Regular Season' or 'Playoffs'
    """
    log.info(f"Ingesting game logs: {season} ({season_type})")

    # --- Player game logs ---
    try:
        player_df = fetch_endpoint(
            LeagueGameFinder,
            result_set_index=0,
            season_nullable=season,
            season_type_nullable=season_type,
            player_or_team_abbreviation="P",
            league_id_nullable="00",  # NBA
        )
        if not player_df.empty:
            player_df.columns = [c.lower() for c in player_df.columns]
            # Add season_type since it's not always in the response
            player_df["season_type"] = season_type
            rows = delete_and_insert(
                player_df,
                "raw.player_game_logs",
                partition_columns={"season_id": season, "season_type": season_type},
            )
            log.info(f"  Player game logs: {rows} rows")
        else:
            log.warning(f"  No player game logs for {season} {season_type}")
    except Exception as e:
        log.error(f"  Player game logs failed: {e}")

    # --- Team game logs ---
    try:
        team_df = fetch_endpoint(
            LeagueGameFinder,
            result_set_index=0,
            season_nullable=season,
            season_type_nullable=season_type,
            player_or_team_abbreviation="T",
            league_id_nullable="00",
        )
        if not team_df.empty:
            team_df.columns = [c.lower() for c in team_df.columns]
            team_df["season_type"] = season_type
            rows = delete_and_insert(
                team_df,
                "raw.team_game_logs",
                partition_columns={"season_id": season, "season_type": season_type},
            )
            log.info(f"  Team game logs: {rows} rows")
        else:
            log.warning(f"  No team game logs for {season} {season_type}")
    except Exception as e:
        log.error(f"  Team game logs failed: {e}")


def get_game_ids_for_season(season: str, season_type: str = SEASON_TYPE_REGULAR) -> list[str]:
    """
    Get all unique game IDs for a season from already-ingested team game logs.
    Call this AFTER ingest_game_logs_for_season.
    Falls back to an API call if game logs haven't been ingested yet.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT game_id
                FROM raw.team_game_logs
                WHERE season_id = %s
                ORDER BY game_id
                """,
                (season,),
            )
            game_ids = [row[0] for row in cur.fetchall()]

    if game_ids:
        log.info(f"Found {len(game_ids)} games for {season} in database")
        return game_ids

    # Fallback: pull from API directly
    log.info(f"No game logs in DB for {season}, fetching from API")
    df = fetch_endpoint(
        LeagueGameFinder,
        result_set_index=0,
        season_nullable=season,
        season_type_nullable=season_type,
        player_or_team_abbreviation="T",
        league_id_nullable="00",
    )
    if df.empty:
        return []

    df.columns = [c.lower() for c in df.columns]
    game_ids = sorted(df["game_id"].unique().tolist())
    log.info(f"Found {len(game_ids)} games for {season} from API")
    return game_ids


def ingest_all_game_logs(seasons: list[str]):
    """Ingest game logs for multiple seasons (regular season + playoffs)."""
    log.info(f"=== Ingesting game logs for {len(seasons)} seasons ===")
    for season in seasons:
        ingest_game_logs_for_season(season, SEASON_TYPE_REGULAR)
        ingest_game_logs_for_season(season, SEASON_TYPE_PLAYOFFS)
    log.info("=== Game logs ingestion complete ===")
