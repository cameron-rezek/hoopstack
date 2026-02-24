"""
Database connection management and bulk insert/upsert utilities.
Uses psycopg2 with connection pooling for reliable inserts.
"""

import psycopg2
import psycopg2.extras
import psycopg2.pool
import pandas as pd
from contextlib import contextmanager

from config import DB_DSN
from logger import get_logger

log = get_logger("db")

# Connection pool: 1-5 connections (we're single-threaded but want reconnect resilience)
_pool = None


def get_pool() -> psycopg2.pool.SimpleConnectionPool:
    global _pool
    if _pool is None or _pool.closed:
        log.info("Creating database connection pool")
        _pool = psycopg2.pool.SimpleConnectionPool(1, 5, DB_DSN)
    return _pool


@contextmanager
def get_conn():
    """Get a connection from the pool, auto-return on exit."""
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def test_connection() -> bool:
    """Verify we can reach the database."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                log.info("Database connection OK")
                return True
    except Exception as e:
        log.error(f"Database connection failed: {e}")
        return False


def bulk_insert(df: pd.DataFrame, table: str, conflict_columns: list[str] | None = None):
    """
    Insert a DataFrame into a table. If conflict_columns is provided,
    performs an upsert (ON CONFLICT DO UPDATE) for idempotent loads.

    Args:
        df: DataFrame with columns matching the target table
        table: Fully qualified table name (e.g., 'raw.shot_chart_detail')
        conflict_columns: Columns that form the natural key for upsert.
                          If None, does a plain INSERT (duplicates may error).
    """
    if df.empty:
        return 0

    # Clean column names: lowercase, strip whitespace
    df.columns = [c.lower().strip() for c in df.columns]

    # Align DataFrame columns to the target table schema
    df = align_dataframe_to_table(df, table)
    if df.empty:
        return 0

    columns = list(df.columns)
    col_list = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))

    if conflict_columns:
        conflict_cols = ", ".join(f'"{c}"' for c in conflict_columns)
        update_cols = [c for c in columns if c not in conflict_columns and c != "ingested_at"]
        if update_cols:
            update_clause = ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in update_cols)
            update_clause += ', "ingested_at" = NOW()'
            sql = f"""
                INSERT INTO {table} ({col_list})
                VALUES ({placeholders})
                ON CONFLICT ({conflict_cols}) DO UPDATE SET {update_clause}
            """
        else:
            sql = f"""
                INSERT INTO {table} ({col_list})
                VALUES ({placeholders})
                ON CONFLICT ({conflict_cols}) DO NOTHING
            """
    else:
        sql = f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})"

    # Convert DataFrame rows to list of tuples, handling NaN -> None
    records = [
        tuple(None if pd.isna(v) else v for v in row)
        for row in df.itertuples(index=False, name=None)
    ]

    with get_conn() as conn:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, sql, records, page_size=500)
            row_count = len(records)

    return row_count


def delete_and_insert(df: pd.DataFrame, table: str, partition_columns: dict):
    """
    Delete existing rows matching the partition, then insert new ones.
    Good for data that doesn't have a clean natural key (e.g., lineup stats
    where we want to replace the entire season's worth).

    Args:
        df: DataFrame to insert
        table: Target table
        partition_columns: Dict of {column_name: value} to delete before inserting
    """
    if df.empty:
        return 0

    df.columns = [c.lower().strip() for c in df.columns]

    # Align DataFrame columns to the target table schema
    df = align_dataframe_to_table(df, table)
    if df.empty:
        return 0

    where_clause = " AND ".join(f'"{k}" = %s' for k in partition_columns.keys())
    delete_sql = f"DELETE FROM {table} WHERE {where_clause}"

    columns = list(df.columns)
    col_list = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    insert_sql = f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})"

    records = [
        tuple(None if pd.isna(v) else v for v in row)
        for row in df.itertuples(index=False, name=None)
    ]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(delete_sql, list(partition_columns.values()))
            deleted = cur.rowcount
            psycopg2.extras.execute_batch(cur, insert_sql, records, page_size=500)
            log.debug(f"{table}: deleted {deleted}, inserted {len(records)} rows")

    return len(records)


def get_table_columns(table: str) -> list[str]:
    """Get the column names for a table (excluding auto-generated ones like 'id')."""
    schema, table_name = table.split(".")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
                """,
                (schema, table_name),
            )
            return [row[0] for row in cur.fetchall()]


def align_dataframe_to_table(df: pd.DataFrame, table: str) -> pd.DataFrame:
    """
    Align a DataFrame's columns to match a target table.
    - Drops DataFrame columns that don't exist in the table
    - Skips table columns that have defaults (id, ingested_at, source)
    - Warns about missing columns that don't have defaults
    """
    table_cols = get_table_columns(table)
    df_cols = set(df.columns)

    # Columns with server-side defaults that we don't need to provide
    auto_columns = {"id", "ingested_at", "source"}

    # Keep only DataFrame columns that exist in the table
    cols_to_keep = [c for c in df.columns if c in table_cols]
    dropped = df_cols - set(cols_to_keep)
    if dropped - auto_columns:
        log.debug(f"Dropped columns not in {table}: {dropped - auto_columns}")

    # Warn about table columns missing from the DataFrame (excluding auto columns)
    missing = set(table_cols) - df_cols - auto_columns
    if missing:
        log.debug(f"Table {table} columns not in DataFrame (will use defaults): {missing}")

    return df[cols_to_keep]


def get_existing_game_ids(table: str, season: str | None = None) -> set:
    """Get set of game_ids already loaded into a table, optionally filtered by season."""
    where = ""
    params = []
    if season:
        where = "WHERE season = %s"
        params = [season]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT DISTINCT game_id FROM {table} {where}", params)
            return {row[0] for row in cur.fetchall()}
