"""
Configuration for the Hoopstack ingestion pipeline.
Loads from .env file or environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the ingestion directory
load_dotenv(Path(__file__).parent / ".env")


# --- Database ---
DB_HOST = os.getenv("DB_HOST", "192.168.1.22")
DB_PORT = int(os.getenv("DB_PORT", "5434"))
DB_NAME = os.getenv("DB_NAME", "nba_analytics")
DB_USER = os.getenv("DB_USER", "nba_admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

DB_DSN = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"


# --- Rate Limiting ---
REQUEST_DELAY = float(os.getenv("REQUEST_DELAY_SECONDS", "1.5"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
API_TIMEOUT = int(os.getenv("API_TIMEOUT", "60"))  # seconds per request

# --- Throttle Cooldown ---
# When this many games fail consecutively, pause for COOLDOWN_SECONDS before continuing.
# This handles NBA API throttling: back off and let the rate limit window reset.
COOLDOWN_THRESHOLD = int(os.getenv("COOLDOWN_THRESHOLD", "3"))
COOLDOWN_SECONDS = int(os.getenv("COOLDOWN_SECONDS", "300"))  # 5 minutes


# --- Checkpointing ---
CHECKPOINT_DIR = Path(os.getenv("CHECKPOINT_DIR", Path(__file__).parent / "checkpoints"))
CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)


# --- Logging ---
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")


# --- NBA Seasons ---
# Format the NBA API expects: "2023-24"
INITIAL_SEASON_START = 2010  # 2010-11 season
CURRENT_SEASON_START = 2025  # 2025-26 season

def season_string(start_year: int) -> str:
    """Convert a start year like 2023 to the NBA season string '2023-24'."""
    return f"{start_year}-{str(start_year + 1)[-2:]}"

def all_seasons(start: int = INITIAL_SEASON_START, end: int = CURRENT_SEASON_START) -> list[str]:
    """Return list of season strings from start through end inclusive."""
    return [season_string(y) for y in range(start, end + 1)]

# Season types the API uses
SEASON_TYPE_REGULAR = "Regular Season"
SEASON_TYPE_PLAYOFFS = "Playoffs"
