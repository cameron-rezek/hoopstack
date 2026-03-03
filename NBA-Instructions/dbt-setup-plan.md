# dbt Project Setup Plan

## STATUS: COMPLETED (2026-03-03)

All steps in this plan have been executed successfully. The dbt staging layer is live with 5 views and 28 passing tests.

**Deviations from plan:**
1. **Password in profiles.yml**: Hardcoded instead of using `env_var('DBT_PASSWORD')`. The `!!` characters in the password break shell `export` (bash/zsh interpret `!` even in single quotes in some contexts). Since `~/.dbt/profiles.yml` is never committed to git, this is acceptable.
2. **Test YAML syntax**: dbt 1.11 requires generic test arguments nested under `arguments:` property. The `accepted_values` and `unique_combination_of_columns` tests were updated accordingly (the plan's YAML used the older flat syntax).
3. **PBP score_differential**: Added `nullif(..., '')` wrappers around `score_home`/`score_away` casts to handle empty strings in V3 VARCHAR columns (Risk #2 from the plan was real).

---

## Context

All ingestion is complete for 2023-2025 (3 seasons). The `raw` schema in PostgreSQL has 9 populated tables with ~1.8M+ rows total. This document covers initializing a dbt project with source definitions and staging (silver layer) models.

**DB connection:** `192.168.1.22:5434`, database `nba_analytics`, user `nba_admin`, password `ElephantLoopy!!84`

---

## Step 0: Install dbt-postgres

```bash
cd /Users/cameronrezek/Documents/projects/hoopstack
python3 -m venv dbt-venv
source dbt-venv/bin/activate
pip install dbt-postgres
dbt --version  # verify
```

Or use `pipx install dbt-postgres` for a global isolated install.

---

## Step 1: Create `~/.dbt/profiles.yml`

This file lives OUTSIDE the project (standard dbt convention, never committed to git). Uses env vars for sensitive values.

```yaml
hoopstack:
  target: dev
  outputs:
    dev:
      type: postgres
      host: "{{ env_var('DBT_HOST', '192.168.1.22') }}"
      port: "{{ env_var('DBT_PORT', '5434') | int }}"
      user: "{{ env_var('DBT_USER', 'nba_admin') }}"
      password: "{{ env_var('DBT_PASSWORD') }}"
      dbname: nba_analytics
      schema: staging
      threads: 4
      connect_timeout: 10
```

Set the env var (add to `~/.zshrc` or `~/.bash_profile`):
```bash
export DBT_PASSWORD='ElephantLoopy!!84'
```

---

## Step 2: Create the dbt Directory Structure

```
hoopstack/dbt/
├── dbt_project.yml
├── packages.yml
├── macros/
│   └── generate_schema_name.sql
├── models/
│   ├── staging/
│   │   ├── _staging__sources.yml
│   │   ├── _staging__models.yml
│   │   ├── stg_players.sql
│   │   ├── stg_shot_charts.sql
│   │   ├── stg_play_by_play.sql
│   │   ├── stg_player_game_logs.sql
│   │   └── stg_team_game_logs.sql
│   └── analytics/
│       └── _analytics__models.yml      (placeholder)
├── seeds/
│   └── .gitkeep
├── snapshots/
│   └── .gitkeep
├── tests/
│   └── .gitkeep
└── analyses/
    └── .gitkeep
```

---

## Step 3: `dbt_project.yml`

```yaml
name: 'hoopstack'
version: '1.0.0'
config-version: 2

profile: 'hoopstack'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

clean-targets:
  - "target"
  - "dbt_packages"

models:
  hoopstack:
    staging:
      +materialized: view
      +schema: staging
    analytics:
      +materialized: table
      +schema: analytics
```

- Staging = **views** (lightweight, always fresh from raw)
- Analytics = **tables** (pre-computed, expensive aggregations)

---

## Step 4: `packages.yml`

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.0.0", "<2.0.0"]
```

Run `dbt deps` after creating this to install.

---

## Step 5: Custom Schema Name Macro

**File: `dbt/macros/generate_schema_name.sql`**

Without this, dbt creates schemas like `staging_staging` instead of just `staging`.

```sql
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
```

---

## Step 6: Source Definitions

**File: `dbt/models/staging/_staging__sources.yml`**

Defines the 9 populated raw tables. The 4 empty box score tables are excluded.

```yaml
version: 2

sources:
  - name: nba_raw
    description: "Raw bronze layer data ingested from the NBA Stats API via nba_api Python library."
    database: nba_analytics
    schema: raw
    loader: "nba_api python ingestion pipeline"

    tables:
      - name: shot_chart_detail
        description: "Every field goal attempt with court x/y coordinates, shot zone classification, and outcome. ~560k rows across 3 seasons (2023-2025). Natural key: (game_id, game_event_id, player_id)."
        columns:
          - name: game_id
            description: "NBA game identifier (e.g., '0022300001')"
          - name: game_event_id
            description: "Event number within the game"
          - name: player_id
            description: "NBA player identifier"
          - name: loc_x
            description: "Court x-coordinate in tenths of a foot from center baseline"
          - name: loc_y
            description: "Court y-coordinate in tenths of a foot from center baseline"
          - name: shot_made_flag
            description: "1 if made, 0 if missed"
          - name: shot_type
            description: "'2PT Field Goal' or '3PT Field Goal'"

      - name: play_by_play
        description: "Full play-by-play event stream per game using V3 API schema (camelCase converted to snake_case). ~1.16M rows across 3 seasons. Natural key: (game_id, action_number)."
        columns:
          - name: game_id
            description: "NBA game identifier"
          - name: action_number
            description: "Sequential action number within the game (V3 key)"
          - name: person_id
            description: "Player who performed the action (V3 naming)"
          - name: action_type
            description: "Type of play action"
          - name: description
            description: "Human-readable description of the play"

      - name: common_player_info
        description: "Player biographical and demographic information. ~530 active players. Natural key: person_id."
        columns:
          - name: person_id
            description: "NBA player identifier (primary key)"
          - name: display_first_last
            description: "Full display name"

      - name: player_game_logs
        description: "Per-game stats for every player appearance. ~74k rows. Loaded via LeagueGameFinder. Partitioned by (season_id, season_type)."
        columns:
          - name: season_id
            description: "Season identifier (e.g., '2023-24')"
          - name: game_id
            description: "NBA game identifier"
          - name: player_id
            description: "NBA player identifier"

      - name: team_game_logs
        description: "Per-game stats for every team appearance. ~6.9k rows. Partitioned by (season_id, season_type)."
        columns:
          - name: season_id
            description: "Season identifier"
          - name: game_id
            description: "NBA game identifier"
          - name: team_id
            description: "NBA team identifier"

      - name: league_dash_player_stats
        description: "Season-level aggregate player statistics. ~2.1k rows. Partitioned by (season, season_type)."
        columns:
          - name: player_id
            description: "NBA player identifier"
          - name: season
            description: "Season identifier"

      - name: lineup_stats
        description: "5-man lineup combination statistics per season. ~8.3k rows. Partitioned by (season, season_type)."
        columns:
          - name: group_id
            description: "Lineup group identifier"
          - name: season
            description: "Season identifier"

      - name: team_details
        description: "Team information for all 30 NBA teams. Static reference data. Natural key: team_id."
        columns:
          - name: team_id
            description: "NBA team identifier (primary key)"

      - name: draft_history
        description: "Historical NBA draft picks. ~8.2k rows."
        columns:
          - name: person_id
            description: "Drafted player identifier"
```

---

## Step 7: Staging Models

All staging models follow the same pattern:
1. CTE `source` — select from raw source
2. CTE `deduplicated` — add `row_number() over (partition by <natural_key> order by ingested_at desc) as rn`
3. Final select `where rn = 1`

### IMPORTANT: Verify column names first

The `player_game_logs` and `team_game_logs` tables were populated dynamically (NBA API response columns aligned to table schema via `align_dataframe_to_table()` in `ingestion/db.py`). Before writing staging SQL for these tables, **query the actual column names**:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'raw' AND table_name = 'player_game_logs'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'raw' AND table_name = 'team_game_logs'
ORDER BY ordinal_position;
```

Adjust the staging model column references to match whatever the DB actually has.

### 7a. `stg_players.sql`

Source: `raw.common_player_info` | Dedup key: `person_id`

```sql
with source as (
    select * from {{ source('nba_raw', 'common_player_info') }}
),

deduplicated as (
    select
        person_id as player_id,
        trim(display_first_last) as player_name,
        trim(first_name) as first_name,
        trim(last_name) as last_name,
        birthdate::date as birth_date,
        school,
        country,
        nullif(height, '')::varchar as height,
        nullif(weight, '')::integer as weight,
        season_exp as seasons_experience,
        jersey::varchar as jersey_number,
        position,
        team_id,
        team_name,
        team_abbreviation,
        from_year::integer as career_start_year,
        to_year::integer as career_end_year,
        draft_year,
        draft_round,
        draft_number,
        greatest_75_flag::boolean as is_75th_anniversary_team,
        row_number() over (
            partition by person_id
            order by ingested_at desc
        ) as rn
    from source
)

select
    player_id,
    player_name,
    first_name,
    last_name,
    birth_date,
    school,
    country,
    height,
    weight,
    seasons_experience,
    jersey_number,
    position,
    team_id,
    team_name,
    team_abbreviation,
    career_start_year,
    career_end_year,
    draft_year,
    draft_round,
    draft_number,
    is_75th_anniversary_team
from deduplicated
where rn = 1
```

### 7b. `stg_shot_charts.sql`

Source: `raw.shot_chart_detail` | Dedup key: `(game_id, game_event_id, player_id)`

Key computed fields:
- `distance_feet` — sqrt(loc_x^2 + loc_y^2) / 10
- `shot_angle` — degrees(atan2(loc_x, loc_y))
- `game_minutes_elapsed` — handles regulation (12 min periods) and OT (5 min periods)
- `is_location_reliable` — false when loc_x=0 and loc_y=0
- `shot_value` — 2 or 3 based on shot_type
- `is_made` — boolean cast of shot_made_flag

```sql
with source as (
    select * from {{ source('nba_raw', 'shot_chart_detail') }}
),

deduplicated as (
    select
        game_id,
        game_event_id,
        player_id,
        player_name,
        team_id,
        team_name,
        period,
        case
            when period <= 4 then
                (12.0 * (period - 1))
                + (12.0 - minutes_remaining)
                + (60.0 - seconds_remaining) / 60.0
            else
                48.0
                + (5.0 * (period - 5))
                + (5.0 - minutes_remaining)
                + (60.0 - seconds_remaining) / 60.0
        end as game_minutes_elapsed,
        minutes_remaining,
        seconds_remaining,
        event_type,
        action_type,
        shot_type,
        shot_zone_basic,
        shot_zone_area,
        shot_zone_range,
        shot_distance,
        loc_x,
        loc_y,
        round(sqrt(loc_x::numeric ^ 2 + loc_y::numeric ^ 2) / 10.0, 1) as distance_feet,
        degrees(atan2(loc_x::numeric, loc_y::numeric)) as shot_angle,
        shot_made_flag::boolean as is_made,
        case when shot_type = '3PT Field Goal' then 3 else 2 end as shot_value,
        case
            when loc_x = 0 and loc_y = 0 then false
            else true
        end as is_location_reliable,
        shot_attempted_flag,
        game_date,
        htm,
        vtm,
        season,
        season_type,
        row_number() over (
            partition by game_id, game_event_id, player_id
            order by ingested_at desc
        ) as rn
    from source
)

select
    game_id,
    game_event_id,
    player_id,
    player_name,
    team_id,
    team_name,
    period,
    game_minutes_elapsed,
    minutes_remaining,
    seconds_remaining,
    event_type,
    action_type,
    shot_type,
    shot_zone_basic,
    shot_zone_area,
    shot_zone_range,
    shot_distance,
    loc_x,
    loc_y,
    distance_feet,
    shot_angle,
    is_made,
    shot_value,
    is_location_reliable,
    shot_attempted_flag,
    game_date,
    htm,
    vtm,
    season,
    season_type
from deduplicated
where rn = 1
```

### 7c. `stg_play_by_play.sql`

Source: `raw.play_by_play` (V3 schema) | Dedup key: `(game_id, action_number)`

V3 columns (from progress doc): `game_id, action_number, clock, period, team_id, team_tricode, person_id, player_name, player_name_i, x_legacy, y_legacy, shot_distance, shot_result, is_field_goal, score_home, score_away, points_total, location, description, action_type, sub_type, video_available, shot_value, action_id`

```sql
with source as (
    select * from {{ source('nba_raw', 'play_by_play') }}
),

deduplicated as (
    select
        game_id,
        action_number,
        clock,
        period,
        team_id,
        team_tricode,
        person_id as player_id,
        player_name,
        player_name_i,
        x_legacy,
        y_legacy,
        shot_distance,
        shot_result,
        is_field_goal::boolean as is_field_goal,
        score_home,
        score_away,
        case
            when score_home is not null and score_away is not null
            then score_home::integer - score_away::integer
            else null
        end as score_differential,
        points_total,
        location,
        description,
        action_type,
        sub_type,
        video_available::boolean as is_video_available,
        shot_value,
        action_id,
        row_number() over (
            partition by game_id, action_number
            order by ingested_at desc
        ) as rn
    from source
)

select
    game_id,
    action_number,
    clock,
    period,
    team_id,
    team_tricode,
    player_id,
    player_name,
    player_name_i,
    x_legacy,
    y_legacy,
    shot_distance,
    shot_result,
    is_field_goal,
    score_home,
    score_away,
    score_differential,
    points_total,
    location,
    description,
    action_type,
    sub_type,
    is_video_available,
    shot_value,
    action_id
from deduplicated
where rn = 1
```

### 7d. `stg_player_game_logs.sql`

Source: `raw.player_game_logs` | Dedup key: `(game_id, player_id)`

**Note:** Column names below are based on the LeagueGameFinder API response (lowercased). Verify against the actual DB columns before using (see query above).

```sql
with source as (
    select * from {{ source('nba_raw', 'player_game_logs') }}
),

deduplicated as (
    select
        season_id,
        player_id,
        player_name,
        team_id,
        team_abbreviation,
        team_name,
        game_id,
        game_date::date as game_date,
        matchup,
        wl as win_loss,
        min::numeric as minutes_played,
        pts as points,
        fgm as field_goals_made,
        fga as field_goals_attempted,
        fg_pct as field_goal_pct,
        fg3m as three_pointers_made,
        fg3a as three_pointers_attempted,
        fg3_pct as three_point_pct,
        ftm as free_throws_made,
        fta as free_throws_attempted,
        ft_pct as free_throw_pct,
        oreb as offensive_rebounds,
        dreb as defensive_rebounds,
        reb as total_rebounds,
        ast as assists,
        stl as steals,
        blk as blocks,
        tov as turnovers,
        pf as personal_fouls,
        plus_minus,
        season_type,
        case
            when matchup like '%vs.%' then 'home'
            when matchup like '%@%' then 'away'
            else 'unknown'
        end as home_away,
        row_number() over (
            partition by game_id, player_id
            order by ingested_at desc
        ) as rn
    from source
)

select
    season_id,
    player_id,
    player_name,
    team_id,
    team_abbreviation,
    team_name,
    game_id,
    game_date,
    matchup,
    win_loss,
    home_away,
    minutes_played,
    points,
    field_goals_made,
    field_goals_attempted,
    field_goal_pct,
    three_pointers_made,
    three_pointers_attempted,
    three_point_pct,
    free_throws_made,
    free_throws_attempted,
    free_throw_pct,
    offensive_rebounds,
    defensive_rebounds,
    total_rebounds,
    assists,
    steals,
    blocks,
    turnovers,
    personal_fouls,
    plus_minus,
    season_type
from deduplicated
where rn = 1
```

### 7e. `stg_team_game_logs.sql`

Source: `raw.team_game_logs` | Dedup key: `(game_id, team_id)`

Same structure as player game logs but at team level. Replace `player_id`/`player_name` with `team_id`/`team_name` in the dedup key and remove player-specific columns.

```sql
with source as (
    select * from {{ source('nba_raw', 'team_game_logs') }}
),

deduplicated as (
    select
        season_id,
        team_id,
        team_abbreviation,
        team_name,
        game_id,
        game_date::date as game_date,
        matchup,
        wl as win_loss,
        min::numeric as minutes_played,
        pts as points,
        fgm as field_goals_made,
        fga as field_goals_attempted,
        fg_pct as field_goal_pct,
        fg3m as three_pointers_made,
        fg3a as three_pointers_attempted,
        fg3_pct as three_point_pct,
        ftm as free_throws_made,
        fta as free_throws_attempted,
        ft_pct as free_throw_pct,
        oreb as offensive_rebounds,
        dreb as defensive_rebounds,
        reb as total_rebounds,
        ast as assists,
        stl as steals,
        blk as blocks,
        tov as turnovers,
        pf as personal_fouls,
        plus_minus,
        season_type,
        case
            when matchup like '%vs.%' then 'home'
            when matchup like '%@%' then 'away'
            else 'unknown'
        end as home_away,
        row_number() over (
            partition by game_id, team_id
            order by ingested_at desc
        ) as rn
    from source
)

select
    season_id,
    team_id,
    team_abbreviation,
    team_name,
    game_id,
    game_date,
    matchup,
    win_loss,
    home_away,
    minutes_played,
    points,
    field_goals_made,
    field_goals_attempted,
    field_goal_pct,
    three_pointers_made,
    three_pointers_attempted,
    three_point_pct,
    free_throws_made,
    free_throws_attempted,
    free_throw_pct,
    offensive_rebounds,
    defensive_rebounds,
    total_rebounds,
    assists,
    steals,
    blocks,
    turnovers,
    personal_fouls,
    plus_minus,
    season_type
from deduplicated
where rn = 1
```

---

## Step 8: Schema Tests & Docs

**File: `dbt/models/staging/_staging__models.yml`**

```yaml
version: 2

models:
  - name: stg_players
    description: "Cleaned and deduplicated player biographical data. One row per player (most recent ingestion wins)."
    columns:
      - name: player_id
        description: "Unique NBA player identifier"
        data_tests:
          - unique
          - not_null
      - name: player_name
        description: "Full display name (e.g., 'LeBron James')"
        data_tests:
          - not_null

  - name: stg_shot_charts
    description: "Standardized shot chart data with computed distance, angle, and game clock fields. One row per shot attempt."
    columns:
      - name: game_id
        data_tests:
          - not_null
      - name: game_event_id
        data_tests:
          - not_null
      - name: player_id
        data_tests:
          - not_null
      - name: is_made
        data_tests:
          - not_null
      - name: shot_value
        data_tests:
          - not_null
          - accepted_values:
              values: [2, 3]
      - name: season
        data_tests:
          - not_null
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns:
            - game_id
            - game_event_id
            - player_id

  - name: stg_play_by_play
    description: "Cleaned V3 play-by-play event stream. One row per action per game."
    columns:
      - name: game_id
        data_tests:
          - not_null
      - name: action_number
        data_tests:
          - not_null
      - name: period
        data_tests:
          - not_null
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns:
            - game_id
            - action_number

  - name: stg_player_game_logs
    description: "Player-level per-game statistics. Primary source of box score data."
    columns:
      - name: game_id
        data_tests:
          - not_null
      - name: player_id
        data_tests:
          - not_null
      - name: season_id
        data_tests:
          - not_null
      - name: game_date
        data_tests:
          - not_null
      - name: win_loss
        data_tests:
          - accepted_values:
              values: ['W', 'L']
      - name: home_away
        data_tests:
          - accepted_values:
              values: ['home', 'away', 'unknown']
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns:
            - game_id
            - player_id

  - name: stg_team_game_logs
    description: "Team-level per-game statistics. One row per team per game."
    columns:
      - name: game_id
        data_tests:
          - not_null
      - name: team_id
        data_tests:
          - not_null
      - name: season_id
        data_tests:
          - not_null
      - name: game_date
        data_tests:
          - not_null
      - name: win_loss
        data_tests:
          - accepted_values:
              values: ['W', 'L']
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns:
            - game_id
            - team_id
```

---

## Step 9: Analytics Placeholder

**File: `dbt/models/analytics/_analytics__models.yml`**

```yaml
version: 2

# Analytics (gold) models — to be built after staging is validated.
# Planned:
#   - fct_player_game_advanced (advanced stats from game logs + PBP)
#   - agg_shot_expected_value (shot quality model output)
#   - agg_lineup_stats (lineup performance metrics)
#   - agg_player_rolling_stats (rolling averages for trend analysis)
```

---

## Verification Sequence

Run from the `dbt/` directory:

```bash
cd /Users/cameronrezek/Documents/projects/hoopstack/dbt

# 1. Install packages (dbt_utils)
dbt deps

# 2. Verify database connection
dbt debug

# 3. Compile models (checks SQL syntax without executing)
dbt compile

# 4. Run staging models (creates 5 views in staging schema)
dbt run

# 5. Run all tests
dbt test

# 6. Generate documentation & lineage graph
dbt docs generate

# 7. (Optional) View docs locally
dbt docs serve
```

**Actual outcomes (2026-03-03):**
- `dbt debug` → "All checks passed!" with successful Postgres connection
- `dbt run` → 5 views created in the `staging` schema (0.25s, PASS=5)
- `dbt test` → 28/28 tests passed (1.86s, PASS=28 WARN=0 ERROR=0)
- `dbt docs generate` → Catalog written to `dbt/target/catalog.json`

---

## Known Risks & Mitigations

1. **Game log column names**: The `player_game_logs` and `team_game_logs` tables were populated dynamically. The column names (e.g., `pts`, `fgm`, `wl`) come from the NBA API and were lowercased during ingestion. Query `information_schema.columns` to verify exact names before finalizing the staging models.

2. **V3 PBP score columns**: `score_home` and `score_away` may be stored as VARCHAR in the raw table. The `::integer` cast could fail on empty strings. Use `nullif(score_home, '')::integer` if needed.

3. **Schema naming**: Without the `generate_schema_name` macro, dbt would create schemas like `staging_staging`. The custom macro ensures models go to `staging` and `analytics` directly.

---

## What Comes Next (After This Setup)

1. Build analytics (gold) models: `fct_player_game_advanced`, `agg_shot_expected_value`, `agg_lineup_stats`, `agg_player_rolling_stats`
2. Set up nightly incremental ingestion (cron/Airflow)
3. Write more dbt tests (relationships, custom data quality)
4. Generate and review dbt docs lineage graph
