"""
NBA API client wrapper.
Handles rate limiting, retries, and DataFrame extraction from nba_api endpoints.
"""

import time
import pandas as pd
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import REQUEST_DELAY, MAX_RETRIES
from logger import get_logger

log = get_logger("nba_client")

# Track the last request time for rate limiting
_last_request_time = 0.0


def _rate_limit():
    """Enforce minimum delay between API requests."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < REQUEST_DELAY:
        sleep_time = REQUEST_DELAY - elapsed
        time.sleep(sleep_time)
    _last_request_time = time.time()


@retry(
    stop=stop_after_attempt(MAX_RETRIES),
    wait=wait_exponential(multiplier=2, min=3, max=30),
    retry=retry_if_exception_type((ConnectionError, TimeoutError, Exception)),
    before_sleep=lambda retry_state: log.warning(
        f"Retry {retry_state.attempt_number}/{MAX_RETRIES} after error: "
        f"{retry_state.outcome.exception()}"
    ),
)
def fetch_endpoint(endpoint_class, result_set_index: int = 0, **kwargs) -> pd.DataFrame:
    """
    Call an nba_api endpoint and return the result as a DataFrame.

    Args:
        endpoint_class: The nba_api endpoint class (e.g., ShotChartDetail)
        result_set_index: Which result set to extract (some endpoints return multiple)
        **kwargs: Parameters to pass to the endpoint

    Returns:
        DataFrame with the API response data
    """
    _rate_limit()

    endpoint_name = endpoint_class.__name__
    log.debug(f"Fetching {endpoint_name} with params: {kwargs}")

    try:
        response = endpoint_class(**kwargs)
        result_sets = response.get_data_frames()

        if not result_sets or result_set_index >= len(result_sets):
            log.warning(f"{endpoint_name}: No data returned (result_set_index={result_set_index})")
            return pd.DataFrame()

        df = result_sets[result_set_index]
        log.debug(f"{endpoint_name}: Got {len(df)} rows")
        return df

    except Exception as e:
        error_msg = str(e)
        # Don't retry on "no data" responses, those are expected for some games
        if "200" in error_msg and "no data" in error_msg.lower():
            log.debug(f"{endpoint_name}: No data available (expected for some games)")
            return pd.DataFrame()
        raise


def fetch_all_result_sets(endpoint_class, **kwargs) -> list[pd.DataFrame]:
    """
    Call an nba_api endpoint and return ALL result sets.
    Useful for endpoints like BoxScoreTraditionalV2 that return
    both player-level and team-level data.
    """
    _rate_limit()

    endpoint_name = endpoint_class.__name__
    log.debug(f"Fetching all result sets from {endpoint_name}")

    try:
        response = endpoint_class(**kwargs)
        return response.get_data_frames()
    except Exception as e:
        log.error(f"{endpoint_name} failed: {e}")
        raise
