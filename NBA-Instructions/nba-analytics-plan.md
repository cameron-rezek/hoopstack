# NBA Analytics Platform: Full Project Plan

## Vision

A data-driven NBA analytics platform that goes beyond basic stat tables to surface real insight through sophisticated modeling, compelling visualization, and clean data engineering. Built as a portfolio centerpiece that demonstrates SQL/data modeling depth, visualization craft, and product thinking, with architecture that supports eventual productization.

---

## Infrastructure & Hosting

### Unraid Server (Development + Backend Services)

Your Unraid box is the backbone here. You're already running 40+ Docker containers, so spinning up additional services is second nature. Here's what lives on Unraid:

**PostgreSQL 16** (Docker container)
- Primary data warehouse for all NBA data
- Allocate a dedicated pool/share for the DB files so you're not competing with media storage for I/O
- Set up a nightly pg_dump to a backup share as a safety net
- Expose internally on your LAN, but not to the public internet directly

**pgAdmin or CloudBeaver** (Docker container)
- Web-based SQL client for querying and exploring your schema visually
- Useful for building queries interactively before formalizing them in dbt

**Apache Airflow** (Docker container)
- Orchestrates all your ETL pipelines: data ingestion, transformation triggers, model refreshes
- Lightweight alternative if Airflow feels heavy: Dagster (more modern, better local dev experience) or even a simple cron + Python script setup to start, graduating to Airflow when complexity warrants it
- Scheduler runs nightly during the season to pull fresh game data, and on-demand for historical backfills

**FastAPI Application** (Docker container)
- Your REST API layer sitting on top of PostgreSQL
- Serves transformed, analytics-ready data to the frontend
- Auto-generated OpenAPI docs at /docs (great for portfolio demos)
- Connection pooling via asyncpg or SQLAlchemy async

**Redis** (Docker container, optional but recommended)
- Cache layer for expensive queries (lineup combinations, rolling aggregations)
- Speeds up the API significantly for repeated requests
- You might already be running Redis for other services

**dbt Core** (runs inside Airflow or standalone container)
- Transformation layer that turns raw ingested data into analytics-ready models
- Version-controlled SQL transformations with built-in testing and documentation
- dbt docs generates a beautiful interactive data lineage graph, which is itself a portfolio piece

### Frontend Hosting (Vercel or Cloudflare Pages)

The React/Next.js frontend deploys externally for public access. This keeps your Unraid server secure (no need to expose it to the internet) while giving the dashboard a fast, globally-distributed frontend.

- Vercel is the natural fit for Next.js, free tier is generous
- The frontend calls your FastAPI endpoints, which you expose through a Cloudflare Tunnel or similar reverse proxy from your Unraid box
- Alternatively, if you want everything self-hosted, throw the frontend in a Docker container behind your existing reverse proxy (Traefik, Nginx Proxy Manager, Caddy, whatever you're running)

### Networking Between Unraid and the Public Internet

You probably already have a reverse proxy for your other services. The API needs a public-facing endpoint for the Vercel-hosted frontend to call. Options:

- **Cloudflare Tunnel** (recommended): No ports to open, encrypted, free. You already might be using this for other homelab services.
- **Reverse proxy + DDNS**: If you're already exposing services this way, just add another subdomain (e.g., `nba-api.yourdomain.com`)
- **Tailscale/WireGuard**: If you want to keep it private during development, access everything through your VPN

---

## Data Sources

### Primary: NBA Stats API (via `nba_api` Python Library)

This is the richest free source. The `nba_api` library wraps the undocumented endpoints that power stats.nba.com.

**Key endpoints you'll use:**

| Endpoint | What It Gets You | Update Frequency |
|----------|-----------------|------------------|
| `leaguegamefinder` | Game logs for any player/team/season | After each game |
| `shotchartdetail` | Every shot attempt with x/y coordinates | After each game |
| `playbyplayv2` | Full play-by-play for any game | After each game |
| `boxscoretraditionalv2` | Traditional box scores | After each game |
| `boxscoreadvancedv2` | Advanced box score metrics | After each game |
| `boxscoremiscv2` | Misc stats (second chance pts, fast break, etc.) | After each game |
| `leaguedashlineups` | Lineup combination stats | Aggregated, updates daily |
| `leaguedashplayerstats` | Season aggregate player stats | Updates daily |
| `commonplayerinfo` | Player bio/demographic info | Mostly static |
| `teamdetails` | Team info, arena, history | Mostly static |
| `drafthistory` | Full draft history | Annual |

**Gotchas and rate limiting:**
- The NBA Stats API is undocumented and unofficial. It works, but it can break without notice when the NBA updates their site.
- Rate limit yourself aggressively. Add 1-2 second delays between requests or you'll get IP-blocked. The `nba_api` library handles some of this, but be conservative during the historical backfill. The initial 15-season load (2010-present) should take 3-5 hours with conservative rate limiting. If you later expand to 2000, budget another 5-8 hours for the older seasons.
- Data quality is very reliable from 2010 onward. Shot chart coordinates, play-by-play, and advanced box scores are all complete. If you later expand to 2000, the earlier seasons have more gaps (see Data Quality Notes below).
- Shot chart data and play-by-play are both solid from 2010-11 onward with no meaningful gaps.
- Headers matter. The API checks the `Referer` and sometimes `User-Agent`. The `nba_api` library handles this but if you ever go direct, keep it in mind.
- Build your ingestion with retry logic and per-game error handling so a single bad game doesn't kill a full season backfill. This is especially important if you later expand to pre-2010 data where some game IDs have quirks.

### Secondary: Basketball Reference (via `basketball_reference_web_scraper` or direct scraping)

Fills in gaps that the NBA Stats API doesn't cover well, particularly historical data and some advanced metrics they pre-compute.

- Good for: historical season totals, career stats, award history, all-star selections
- Respect their robots.txt and don't hammer them. Cache aggressively.
- Useful as a validation source to cross-check your own computed metrics

### Tertiary: NBA Schedule / Odds APIs

If you ever want to add predictive elements:
- The NBA has a public schedule endpoint
- ESPN has accessible API endpoints for odds and game metadata
- For live-ish data during games, the NBA's CDN endpoints update frequently (though this is more relevant for a future product phase)

### Data Volume Estimates (2010-11 through Present, ~15 Seasons)

To set expectations for your Postgres instance:

| Table | Approximate Rows (Initial Load) | Growth Per Season | If Expanded to 2000 |
|-------|--------------------------------|-------------------|---------------------|
| Game logs (player-level) | ~2M+ | ~30K | ~3.5M+ |
| Shot chart detail | ~3.75M+ | ~250K | ~6.5M+ |
| Play-by-play events | ~8.5M+ | ~1M | ~15M+ |
| Lineup stints | ~750K+ | ~50K | ~1.2M+ |
| Box scores (game-level) | ~37K+ | ~2.5K | ~60K+ |

With all three schema layers (raw, staging, analytics), indexes, and materialized views, expect roughly **25-35 GB total** on disk for the initial 2010-present load. Expanding to 2000 later would bring it to ~50-60 GB. Both are negligible on 40TB of free Unraid storage. With proper indexing, even the multi-million-row tables query fast.

### Data Quality Notes by Era

Starting at 2010 gives you consistently reliable data. The table below covers the full range in case you expand to 2000 later:

| Era | Shot Chart Data | Play-by-Play | Advanced Box Scores | Notes |
|-----|----------------|--------------|---------------------|-------|
| 2000-04 | Available but some games have incomplete coordinates | Solid, occasional missing events | Partial on some endpoints | *Future expansion.* Roughest stretch, needs quality flagging. |
| 2004-10 | Reliable, rare gaps | Solid | Mostly complete | *Future expansion.* Quality improves significantly around 2004-05. |
| **2010-15** | **Very reliable** | **Very reliable** | **Complete** | **Initial load.** Modern data era begins. |
| **2015-present** | **Excellent** | **Excellent** | **Complete** | **Initial load.** Full data availability, no meaningful gaps. |

**How the pipeline handles quality (built now, pays off when expanding later):**
- Every staging model includes a `data_quality_score` field (1-5 scale) computed from completeness checks
- Shot chart records with `loc_x = 0 AND loc_y = 0` get flagged as `is_location_reliable = FALSE`
- An `is_complete` flag on game-level records indicates whether all expected data is present
- The frontend displays data quality context when users are viewing older seasons
- dbt tests include era-specific thresholds so older data doesn't fail modern completeness checks

**Team relocations and rebrandings to handle in dim_teams (some within initial 2010-present scope):**
- Seattle SuperSonics to Oklahoma City Thunder (2008, pre-dates initial load but affects historical references)
- New Jersey Nets to Brooklyn Nets (2012)
- Charlotte Bobcats to Charlotte Hornets (2014)
- *Future expansion would add:* Vancouver Grizzlies to Memphis Grizzlies (2001), original Hornets to Pelicans (2002/2013)
- Use a `dim_team_history` slowly changing dimension table to track these transitions cleanly

---

## Data Model Design

This is the centerpiece of the portfolio. A well-designed schema tells interviewers you understand data modeling for real, not just "I threw everything in a pandas DataFrame."

### Layer 1: Raw (Bronze)

Mirror the API response structure with minimal transformation. Every record gets an `ingested_at` timestamp and a `source` identifier. This gives you full data lineage.

```sql
-- Example: raw shot chart data exactly as the API returns it
CREATE TABLE raw.shot_chart_detail (
    id BIGSERIAL PRIMARY KEY,
    game_id VARCHAR(10) NOT NULL,
    game_event_id INTEGER,
    player_id INTEGER NOT NULL,
    player_name VARCHAR(100),
    team_id INTEGER,
    team_name VARCHAR(50),
    period INTEGER,
    minutes_remaining INTEGER,
    seconds_remaining INTEGER,
    event_type VARCHAR(20),        -- 'Made Shot' or 'Missed Shot'
    action_type VARCHAR(50),       -- 'Driving Layup', 'Pull Up Jump Shot', etc.
    shot_type VARCHAR(20),         -- '2PT Field Goal' or '3PT Field Goal'
    shot_zone_basic VARCHAR(30),
    shot_zone_area VARCHAR(30),
    shot_zone_range VARCHAR(30),
    shot_distance INTEGER,
    loc_x INTEGER,                 -- court coordinates
    loc_y INTEGER,                 -- court coordinates
    shot_attempted_flag INTEGER,
    shot_made_flag INTEGER,
    game_date DATE,
    htm VARCHAR(5),                -- home team
    vtm VARCHAR(5),                -- visitor team
    season VARCHAR(10),            -- e.g., '2024-25'
    season_type VARCHAR(20),       -- 'Regular Season', 'Playoffs'
    ingested_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'nba_api'
);

-- Example: raw play-by-play
CREATE TABLE raw.play_by_play (
    id BIGSERIAL PRIMARY KEY,
    game_id VARCHAR(10) NOT NULL,
    eventnum INTEGER,
    eventmsgtype INTEGER,          -- 1=made shot, 2=miss, 3=FT, 4=rebound, etc.
    eventmsgactiontype INTEGER,
    period INTEGER,
    wctimestring VARCHAR(20),
    pctimestring VARCHAR(10),      -- game clock time
    homedescription TEXT,
    neutraldescription TEXT,
    visitordescription TEXT,
    score VARCHAR(20),             -- e.g., '45 - 38'
    scoremargin VARCHAR(10),
    person1type INTEGER,
    player1_id INTEGER,
    player1_name VARCHAR(100),
    player1_team_id INTEGER,
    person2type INTEGER,
    player2_id INTEGER,
    player2_name VARCHAR(100),
    player2_team_id INTEGER,
    person3type INTEGER,
    player3_id INTEGER,
    player3_name VARCHAR(100),
    player3_team_id INTEGER,
    video_available_flag INTEGER,
    ingested_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'nba_api'
);
```

### Layer 2: Staging (Silver)

dbt models that clean, type-cast, deduplicate, and standardize. This is where you handle the messy realities of the data.

```sql
-- dbt model: stg_players.sql
-- Handles the fact that players change teams, have name variations, etc.

WITH source AS (
    SELECT * FROM {{ source('nba_raw', 'common_player_info') }}
),

cleaned AS (
    SELECT
        person_id AS player_id,
        TRIM(display_first_last) AS player_name,
        TRIM(first_name) AS first_name,
        TRIM(last_name) AS last_name,
        birthdate::DATE AS birth_date,
        school,
        country,
        NULLIF(height, '')::VARCHAR AS height,
        NULLIF(weight, '')::INTEGER AS weight,
        season_exp AS seasons_experience,
        jersey::VARCHAR AS jersey_number,
        position,
        team_id,
        team_name,
        team_abbreviation,
        from_year::INTEGER AS career_start_year,
        to_year::INTEGER AS career_end_year,
        draft_year,
        draft_round,
        draft_number,
        greatest_75_flag::BOOLEAN AS is_75th_anniversary_team,
        ROW_NUMBER() OVER (
            PARTITION BY person_id
            ORDER BY ingested_at DESC
        ) AS rn  -- deduplicate to most recent record
    FROM source
)

SELECT * FROM cleaned WHERE rn = 1

-- dbt model: stg_shot_charts.sql
-- Standardize shot data, add computed fields

WITH source AS (
    SELECT * FROM {{ source('nba_raw', 'shot_chart_detail') }}
),

cleaned AS (
    SELECT
        game_id,
        game_event_id,
        player_id,
        player_name,
        team_id,
        period,
        (12 * (period - 1)) + (12 - minutes_remaining)
            + (60 - seconds_remaining)::FLOAT / 60
            AS game_minutes_elapsed,
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

        -- Convert court coordinates to feet from basket
        -- loc_x and loc_y are in 10ths of a foot from center court baseline
        ROUND(SQRT(loc_x^2 + loc_y^2) / 10.0, 1) AS distance_feet,

        -- Angle from basket (useful for shot charts)
        DEGREES(ATAN2(loc_x, loc_y)) AS shot_angle,

        shot_made_flag::BOOLEAN AS is_made,
        CASE WHEN shot_type = '3PT Field Goal' THEN 3 ELSE 2 END AS shot_value,
        game_date,
        season,
        season_type,
        ROW_NUMBER() OVER (
            PARTITION BY game_id, game_event_id, player_id
            ORDER BY ingested_at DESC
        ) AS rn
    FROM source
)

SELECT * FROM cleaned WHERE rn = 1
```

### Layer 3: Analytics (Gold)

Pre-computed metrics tables that the API serves directly. This is where the interesting analytical work lives.

```sql
-- Fact: Player game-level advanced stats (computed from box scores + play-by-play)
CREATE TABLE analytics.fct_player_game_advanced AS (
    -- columns include:
    -- player_id, game_id, game_date, season, team_id
    -- minutes_played, possessions_played
    -- true_shooting_pct        (PTS / (2 * (FGA + 0.44 * FTA)))
    -- effective_fg_pct         ((FGM + 0.5 * FG3M) / FGA)
    -- usage_rate               (100 * ((FGA + 0.44 * FTA + TOV) * (team_min / 5)) / (MIN * team_poss))
    -- offensive_rating         (estimated points produced per 100 possessions)
    -- defensive_rating         (estimated points allowed per 100 possessions)
    -- assist_pct               (AST / (((MIN / (team_min / 5)) * team_fgm) - FGM))
    -- rebound_pct              (offensive + defensive)
    -- turnover_pct             (TOV / (FGA + 0.44 * FTA + TOV))
    -- pace                     (possessions per 48 minutes)
    -- game_score               (Hollinger's game score formula)
    -- plus_minus               (raw +/- from box score)
    -- partial_possessions      (for per-possession normalization)
);

-- Aggregation: Shot quality model output
CREATE TABLE analytics.agg_shot_expected_value AS (
    -- Each shot tagged with:
    -- expected_make_probability (from logistic regression model)
    -- expected_points          (probability * shot_value)
    -- actual_points            (shot_made_flag * shot_value)
    -- points_above_expected    (actual - expected)
    --
    -- Aggregated to player-season level:
    -- total_expected_points, total_actual_points
    -- points_above_expected_per_100_shots
    -- shot_quality_score       (avg expected value of shots taken, measures shot selection)
    -- shot_making_score        (actual vs expected, measures pure shooting skill)
);

-- Aggregation: Lineup performance
CREATE TABLE analytics.agg_lineup_stats AS (
    -- lineup_hash (sorted player_id combination for consistent grouping)
    -- player_1_id through player_5_id (sorted)
    -- team_id, season
    -- total_possessions, minutes_played
    -- offensive_rating, defensive_rating, net_rating
    -- pace
    -- effective_fg_pct, turnover_pct, offensive_rebound_pct, ft_rate
    -- (the four factors for both offense and defense)
    -- sample_size_flag (warn when < 100 possessions)
);

-- Aggregation: Player rolling stats (for trend analysis)
CREATE TABLE analytics.agg_player_rolling_stats AS (
    -- player_id, game_date, game_number (within season)
    -- rolling_5_game, rolling_10_game, rolling_20_game windows for:
    --   points, assists, rebounds, ts_pct, usage_rate, net_rating
    -- season_to_date averages
    -- These power the sparklines and trend charts in the frontend
);
```

### Dimension Tables

```sql
CREATE TABLE dims.dim_players (
    player_id INTEGER PRIMARY KEY,
    player_name VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    birth_date DATE,
    height_inches INTEGER,
    weight_lbs INTEGER,
    position VARCHAR(20),
    draft_year INTEGER,
    draft_round INTEGER,
    draft_number INTEGER,
    career_start_year INTEGER,
    career_end_year INTEGER,          -- NULL if active
    is_active BOOLEAN,
    headshot_url VARCHAR(255),        -- NBA CDN URL for player photos
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dims.dim_teams (
    team_id INTEGER PRIMARY KEY,
    team_name VARCHAR(50),
    team_abbreviation VARCHAR(5),
    city VARCHAR(50),
    conference VARCHAR(10),
    division VARCHAR(20),
    arena_name VARCHAR(100),
    primary_color VARCHAR(7),         -- hex color for viz
    secondary_color VARCHAR(7),       -- hex color for viz
    logo_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dims.dim_seasons (
    season_id VARCHAR(10) PRIMARY KEY,  -- '2024-25'
    start_date DATE,
    end_date DATE,
    all_star_date DATE,
    playoff_start_date DATE,
    finals_start_date DATE,
    is_current BOOLEAN
);

-- Slowly changing dimension for team relocations/rebrandings
-- Tracks: Nets NJ→Brooklyn, Bobcats→Hornets, and future expansion
-- (SuperSonics→Thunder, Grizzlies Vancouver→Memphis, etc.)
CREATE TABLE dims.dim_team_history (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL,
    team_name VARCHAR(50),
    team_abbreviation VARCHAR(5),
    city VARCHAR(50),
    arena_name VARCHAR(100),
    conference VARCHAR(10),
    division VARCHAR(20),
    effective_from DATE NOT NULL,
    effective_to DATE,                 -- NULL if current
    is_current BOOLEAN DEFAULT FALSE
);

CREATE TABLE dims.dim_game_types (
    game_type_id VARCHAR(20) PRIMARY KEY,
    description VARCHAR(50)
    -- 'Regular Season', 'Playoffs', 'All Star', 'Pre Season', 'Play-In'
);
```

### Indexing Strategy

```sql
-- Shot charts: most queries filter by player + season, or game
CREATE INDEX idx_shots_player_season ON analytics.fct_shots(player_id, season);
CREATE INDEX idx_shots_game ON analytics.fct_shots(game_id);
CREATE INDEX idx_shots_team_season ON analytics.fct_shots(team_id, season);

-- Play-by-play: always queried by game, sometimes by player
CREATE INDEX idx_pbp_game ON staging.stg_play_by_play(game_id);
CREATE INDEX idx_pbp_player ON staging.stg_play_by_play(player1_id);

-- Game logs: player + season is the most common access pattern
CREATE INDEX idx_gamelogs_player_season ON analytics.fct_player_game_advanced(player_id, season);
CREATE INDEX idx_gamelogs_team_date ON analytics.fct_player_game_advanced(team_id, game_date);

-- Lineups: always filtered by team + season, ordered by minutes for "most used"
CREATE INDEX idx_lineups_team_season ON analytics.agg_lineup_stats(team_id, season);

-- Partial indexes for active season (most common queries hit current season only)
CREATE INDEX idx_shots_current ON analytics.fct_shots(player_id)
    WHERE season = '2024-25';
```

---

## Analytics Features (Detailed)

### Feature 1: Interactive Shot Chart Explorer

**What it does:** Visualize any player's shot chart on a to-scale basketball court. Filter by season, game, quarter, shot type, zone. Toggle between raw location dots, hexbin density maps, and zone-level efficiency heatmaps.

**The analytical depth:**
- Color-code by efficiency relative to league average from that zone (not just made/missed)
- Show shot selection evolution over a career or within a season
- Compare two players side-by-side on the same court
- Overlay the expected points model: where is this player beating expectations vs. leaving points on the floor?

**Visualization approach:**
- D3.js renders a proportionally accurate half-court (the NBA court is 50ft x 47ft, the API coordinates map onto this)
- Three view modes:
  - **Scatter**: Individual shot dots, colored by make/miss or by expected value
  - **Hexbin**: Aggregate into hexagonal bins, sized by volume, colored by efficiency. This is the signature NBA viz that stat heads love.
  - **Zone heatmap**: NBA's official shot zones (restricted area, mid-range, corners, above the break, etc.) with efficiency and volume

**Design notes:**
- Court should be rendered in a muted gray/off-white so the data layer pops
- Use a diverging color scale (red through white through blue/green) for efficiency relative to average
- Tooltips on hover showing: attempts, makes, FG%, league avg FG% from that spot, points above expected
- Smooth animations when switching between players or filters
- The court itself should feel premium. Clean lines, subtle drop shadow, no clutter.

**SQL that powers it:**
```sql
-- Player shot chart with expected value overlay
SELECT
    s.loc_x,
    s.loc_y,
    s.shot_zone_basic,
    s.shot_distance,
    s.is_made,
    s.shot_value,
    s.action_type,
    ev.expected_make_probability,
    ev.expected_points,
    (s.is_made::INT * s.shot_value) - ev.expected_points AS points_above_expected
FROM analytics.fct_shots s
LEFT JOIN analytics.agg_shot_expected_value ev
    ON s.game_id = ev.game_id
    AND s.game_event_id = ev.game_event_id
WHERE s.player_id = :player_id
    AND s.season = :season
ORDER BY s.game_date, s.game_event_id;
```

### Feature 2: Player Comparison & Advanced Metrics Dashboard

**What it does:** Compare up to 3 players across a comprehensive set of traditional and advanced metrics. Radar charts for archetype comparison, rolling performance trends, and contextual stats that adjust for pace and usage.

**The analytical depth:**
- Percentile rankings against the full league (or positional peers)
- Per-possession stats alongside per-game (shows who's efficient vs. who just plays a lot of minutes)
- Usage-adjusted metrics: how does a player's efficiency scale with their usage rate?
- Trend lines showing rolling 10-game averages to visualize hot/cold streaks and trajectory

**Visualization approach:**
- **Radar chart**: 8-10 dimensions showing a player's profile. Scoring, playmaking, rebounding, defense, efficiency, usage, shot selection quality, clutch performance. Percentile-based so the shape means something. Using D3 for this gives you full control over the aesthetic.
- **Sparkline grids**: Small multiples showing rolling averages for key stats across the season. Think Edward Tufte-style information density.
- **Comparison table**: Clean, scannable table with conditional formatting (color gradient backgrounds on cells based on percentile rank). Not a boring table of numbers, but a data-rich visual comparison.
- **Scatter plots**: For exploring relationships. Usage rate vs. true shooting. Assists vs. turnovers. Let users pick the axes.

**Design notes:**
- Use team colors as the accent for each player, pulled from `dim_teams`
- Radar charts should have a subtle grid, not heavy gridlines. Let the data shape dominate.
- Small multiples should share axis scales when comparing players so the visual comparison is honest
- Include sample size context everywhere. A "this is based on N games" footnote prevents misleading conclusions.

### Feature 3: Game Flow & Momentum Visualization

**What it does:** Visualize how a game unfolded through its play-by-play data. Score differential over time, scoring run identification, lineup performance windows, and key swing moments.

**The analytical depth:**
- Parse play-by-play to reconstruct score differential at every event
- Identify "runs" (sequences where one team outscores the other by X+ points within Y possessions)
- Overlay lineup stints on the timeline: which lineup was on the floor during the 15-2 run?
- Win probability model: simple logistic regression using score margin, time remaining, and home/away to estimate win probability at every moment. The win probability chart is one of the most compelling game visualizations.

**Visualization approach:**
- **Score differential area chart**: Time on x-axis, score margin on y-axis, filled area colored by which team is leading. The classic game flow viz.
- **Win probability line chart**: 0-100% on y-axis, game time on x-axis. Dramatic swings become visually obvious.
- **Stint bars**: Below the main chart, horizontal bars showing which lineup was on the floor, colored by that stint's net rating
- **Event markers**: Key plays (big 3-pointers, blocks, turnovers in clutch moments) marked on the timeline

**Design notes:**
- This is a storytelling viz. It should read like a narrative of the game.
- Hover over any point to see the exact score, time, and what just happened
- Smooth the win probability curve slightly so it doesn't look jagged
- Use the teams' actual colors for the fill areas
- For historical games, this is incredibly compelling. "Here's how Game 7 of the 2016 Finals actually unfolded" is the kind of thing that gets shared.

### Feature 4: Lineup Laboratory

**What it does:** Deep dive into lineup combination performance. Which 5-man units are crushing it? Which are bleeding points? How do starters vs. bench units compare? What happens when you pair Player A with Player B?

**The analytical depth:**
- Net rating by lineup with confidence intervals (critical for small sample sizes)
- The "four factors" (eFG%, TOV%, OREB%, FT rate) broken out for each lineup on both ends
- Two-man and three-man combination analysis: "Player X is +8.5 per 100 possessions when playing with Player Y, but -3.2 without him"
- Optimal lineup suggestions based on historical performance (not predictive modeling yet, just "your best 5-man unit by net rating with >100 possessions together")

**Visualization approach:**
- **Lineup cards**: Each lineup displayed as a row of player headshots with key stats. Net rating as a big bold number with color coding (green positive, red negative).
- **Bump chart**: Show how lineup rankings change over the course of a season
- **Network graph** (stretch goal): Players as nodes, edge thickness = minutes shared, edge color = net rating when paired. Visually shows who plays well together.

### Feature 5: Shot Quality Model (Expected Points)

**What it does:** A logistic regression model that predicts the probability of any shot going in based on its characteristics, then uses that to evaluate both shot selection and shot-making ability.

**The modeling approach:**

Features for the logistic regression:
- Shot distance (feet from basket)
- Shot angle (degrees from center)
- Shot zone (restricted area, paint non-RA, mid-range, corner 3, above break 3)
- Shot type (layup, dunk, hook, jump shot, floater, etc.)
- Closest defender distance (if available from tracking data; if not, omit)
- Period (1st quarter vs. 4th quarter)
- Time on shot clock (if parseable from play-by-play)
- Home vs. away
- Days rest

Train on 3+ seasons of league-wide data. Validate on held-out season. This doesn't need to be a complex ML model. A well-tuned logistic regression with good feature engineering is more impressive in an interview than a black-box XGBoost because you can explain every coefficient.

**Output metrics:**
- **Expected Points (xPTS)**: Sum of (make_probability * shot_value) for all shots
- **Points Above Expected (PAX)**: Actual points minus expected points. Positive = this player is making shots harder than they should be.
- **Shot Quality (SQ)**: Average expected value of shots attempted. High SQ = good shot selection. Low SQ = taking tough shots.
- **Shot Making (SM)**: PAX normalized by volume. Pure shooting skill, independent of shot selection.

This decomposition is really powerful: you can separate "Player A scores a lot because he takes easy shots" from "Player B scores a lot because he makes impossibly difficult ones." That's the kind of insight that makes people lean forward.

**Visualization:**
- Shot chart overlaid with expected value heatmap
- Scatter plot: Shot Quality (x-axis) vs. Shot Making (y-axis). Players in the top-right take good shots AND make tough ones. Players in the bottom-left take bad shots and can't hit them.
- Bar chart: Points Above Expected leaders, framed as "the best shooters relative to their shot difficulty"

---

## Tech Stack (Final)

| Layer | Technology | Why |
|-------|-----------|-----|
| Database | PostgreSQL 16 | Battle-tested, great for analytics workloads, full-text search, JSON support if needed |
| Transformations | dbt Core | Industry-standard analytics engineering, generates documentation, testable SQL |
| Orchestration | Airflow (or Dagster) | Manages the full pipeline: ingest, transform, model refresh |
| API | FastAPI (Python) | Async, fast, auto-docs, great Python ecosystem integration |
| Cache | Redis | Speed up repeat queries, cache expensive aggregations |
| Frontend | Next.js + React | SSR for SEO (matters if you productize), your existing skillset |
| Visualizations | D3.js + Recharts | D3 for custom court/shot charts, Recharts for standard charts with less code |
| Statistical Modeling | scikit-learn + statsmodels | Logistic regression for shot model, statsmodels for significance testing |
| ETL Scripts | Python | `nba_api` library, pandas for light transforms before loading |
| Infrastructure | Docker on Unraid | Everything containerized, docker-compose for the full stack |
| Frontend Hosting | Vercel (free tier) | Fast deploys, great Next.js integration, global CDN |
| Version Control | GitHub | Public repo, well-documented. The README itself is a portfolio piece. |

---

## Visualization Design Philosophy

This section matters more than most people think. The difference between a project that gets "oh cool" and one that gets "wow, send me the link" is almost entirely design quality.

### Principles

**1. NBA broadcast aesthetic, not corporate dashboard.**
Take cues from how ESPN, TNT, and The Ringer present basketball data. Bold team colors used sparingly as accents. Dark mode as the default (basketball is watched at night, analytics are consumed in dark mode). Clean sans-serif type. Think "second screen during a game" not "quarterly business review."

**2. Data-ink ratio matters.**
Every pixel should communicate data or provide essential context. No decorative gradients, no 3D effects, no chart junk. Gridlines should be barely visible. Labels should be precise. Edward Tufte would approve.

**3. Progressive disclosure.**
Don't dump everything on the screen at once. Show the headline stat prominently, let the user drill into supporting detail. A shot chart starts as a clean hexbin map; hover reveals the numbers; clicking a zone expands to individual shots. This is both good UX and good data storytelling.

**4. Motion with purpose.**
Animations should help the user track what changed, not just look flashy. When switching players on a shot chart, animate the hexbins morphing. When a filter updates, transition the data smoothly. D3 excels at this. But if something doesn't need to move, don't make it move.

**5. Color is data.**
Reserve color almost exclusively for encoding information: team identity, efficiency relative to average, positive/negative values. Don't use color for decoration. A diverging palette (e.g., red to blue through neutral) for efficiency metrics. Team primary colors for identity. Everything else is grayscale.

### Specific Design Recommendations

**Typography:**
- Headers: Inter or DM Sans (clean, modern, slightly athletic feel)
- Data/numbers: JetBrains Mono or IBM Plex Mono (monospace for tabular alignment, but stylish)
- Body text: Inter or system font stack

**Color palette (dark mode):**
- Background: `#0a0a0f` (near-black with a hint of blue, not pure black)
- Card/surface: `#141420` (slightly elevated)
- Border/divider: `#1e1e30`
- Primary text: `#e8e8f0`
- Secondary text: `#8888a0`
- Accent: Team-contextual, or a default electric blue `#3b82f6`
- Positive: `#22c55e` (green)
- Negative: `#ef4444` (red)
- Neutral: `#6b7280` (gray)

**Chart defaults:**
- Axis lines: `#1e1e30` (barely there)
- Grid lines: `#1a1a28` (even more subtle)
- Tooltip: Dark glass-morphism with backdrop blur
- All charts should have subtle entry animations (fade + slight scale)

**Court rendering (D3):**
- Court lines: `#2a2a40` on the dark background (visible but not dominant)
- The court is a canvas for data, not the star of the show
- Three-point line, free throw circle, restricted area, half court all drawn proportionally
- Paint area gets a very subtle fill to provide spatial context

---

## Phased Roadmap (Detailed)

### Phase 1: Data Foundation (2-3 weeks)

**Week 1: Infrastructure + Schema**
- Spin up PostgreSQL, pgAdmin, and Redis containers on Unraid
- Design and create the raw, staging, and analytics schemas
- Set up the GitHub repo with a solid README
- Initialize dbt project with source definitions

**Week 1-2: ETL Pipeline**
- Write Python ingestion scripts for each NBA API endpoint
- Start with 2023-present as a smoke test (small volume, clean data, fast feedback loop)
- Once validated, kick off the full 2010-11 through present historical backfill (expect 3-5 hours with rate limiting). Can easily run overnight on Unraid.
- Build in per-game error handling and checkpointing so you can resume if interrupted, and so the same pipeline can later backfill 2000-2010 with zero code changes
- Implement rate limiting, error handling, and idempotent upserts
- Set up Airflow (or Dagster or cron) to schedule nightly batch ingestion during the season

**Week 2-3: dbt Transformations**
- Build staging models: cleaning, deduplication, standardization, data quality scoring
- Build analytics models: advanced stats calculations, aggregations
- Write dbt tests (uniqueness, not-null, accepted-values, relationships) with era-appropriate thresholds
- Generate dbt docs and review the lineage graph

**Milestone deliverable:** A fully populated PostgreSQL database with 15 seasons of clean, tested, documented analytics tables. You can run interesting queries against it and get real insights. This alone is demo-worthy in an interview if you walk through the schema and dbt lineage. Expanding to 2000-2010 later is just a backfill run + dbt rebuild.

### Phase 2: API + Core Visualizations (3-4 weeks)

**Week 4: FastAPI Setup**
- Project scaffolding, connection pooling, error handling
- Core endpoints: players, teams, games, shots, lineups
- Query parameterization and filtering (season, team, player, date range)
- Pagination for large result sets
- Auto-generated docs verified and clean

**Week 5-6: Frontend Scaffolding + Shot Charts**
- Next.js project setup with Tailwind, dark mode, responsive layout
- Navigation structure, search/autocomplete for player and team lookup
- D3 court rendering component (reusable across multiple views)
- Shot chart feature: scatter, hexbin, and zone views
- Filters: season, quarter, shot type, zone

**Week 7: Player Comparison Dashboard**
- Radar chart component
- Percentile ranking calculations (API endpoint)
- Sparkline trend components
- Side-by-side comparison view

**Week 7 (parallel): Tableau Public Portfolio**
- Connect Tableau Public to exported CSV snapshots from your analytics tables (Tableau Public can't connect to a live Postgres, so you export curated datasets)
- Build 2-3 polished Tableau dashboards that complement (not duplicate) the web app:
  - **League-wide trends dashboard**: How has the 3-point rate, pace, and scoring evolved from 2010 to present? Interactive filters for era comparison. Gets even richer if you later expand to 2000.
  - **Player season explorer**: Select a player and season, see their statistical profile with context. Percentile gauges, shot distribution breakdowns, game log heatmap.
  - **Team performance comparison**: Net rating, four factors, offensive/defensive splits across teams for a selected season. Scatter plots and highlight tables.
- Publish to Tableau Public and link from the main site's landing page
- This covers job postings that specifically list Tableau/Power BI as requirements

**Milestone deliverable:** A deployed, functional web app with two polished features, plus a Tableau Public portfolio with 2-3 complementary dashboards. This is the "show people" version.

### Phase 3: Advanced Analytics (3-4 weeks)

**Week 8-9: Game Flow Visualization**
- Play-by-play parsing and score reconstruction
- Win probability model (train, validate, deploy as a dbt model or Python script)
- D3 game flow chart with lineup stint overlay
- Historical game lookup and rendering

**Week 9-10: Lineup Laboratory**
- Lineup combination computation (this is the heaviest SQL work)
- Two-man and three-man pairing analysis
- Lineup explorer UI with filtering and sorting
- Sample size warnings and confidence context

**Week 10-11: Shot Quality Model**
- Feature engineering in Python/SQL
- Logistic regression training and validation
- Model output written back to Postgres as an analytics table
- Shot quality vs. shot making scatter plot
- Integration with shot chart explorer (toggle expected value overlay)

**Milestone deliverable:** The full-featured analytics platform with all five core features live.

### Phase 4: Polish & Portfolio Presentation (1-2 weeks)

- Landing page with project overview and methodology explanations
- "About the Data" page explaining sources, freshness, limitations, and data quality by era
- Performance optimization: query tuning, Redis caching for heavy endpoints
- Mobile responsiveness for key views
- SEO basics if hosted publicly
- Blog scaffolding: markdown-based posts rendered in Next.js (MDX is a natural fit)
- First blog post: an analytical deep dive using your own platform's data (e.g., "The Death of the Mid-Range: 15 Years of NBA Shot Selection Data")
- Polished GitHub README with architecture diagram, screenshots, setup instructions
- Tableau dashboards reviewed and polished, linked from the main site
- Custom domain setup (TBD)

### Phase 5: Product Layer & Content (Future / As Desired)

- User accounts and saved views
- Custom alerts ("notify me when Player X's rolling TS% drops below 55%")
- Fantasy basketball integration (projected stat lines, rest-of-season rankings)
- Ongoing blog content: regular analytical write-ups using the platform's data, building an audience and demonstrating communication skills
- Community features (shared analyses, comments)
- Potential newsletter or "daily insights" automated feed
- Expanded Tableau portfolio with seasonal updates and topical dashboards

---

## What This Demonstrates to Employers

Spelled out explicitly, because this matters:

- **Data modeling**: Star schema design, slowly changing dimensions, proper normalization, thoughtful indexing
- **SQL proficiency**: Complex analytical queries, window functions, CTEs, aggregations across millions of rows
- **Data engineering**: ETL pipeline design, orchestration, idempotent processing, data quality testing
- **Analytics engineering**: dbt transformations, documentation, testing, lineage
- **Statistical modeling**: Logistic regression with feature engineering, model validation, interpretable results
- **Visualization**: Custom D3 implementations, interactive charts, thoughtful design, plus Tableau Public dashboards demonstrating tool-based viz proficiency
- **Full-stack development**: API design, React frontend, deployment, infrastructure
- **Product thinking**: Progressive disclosure, user personas, information hierarchy, methodology transparency
- **Communication**: Explaining complex metrics in plain language, documenting your work

That's a comprehensive skill demonstration that very few portfolio projects achieve. Most people show one or two of these. Showing all of them, integrated into a cohesive product, is a strong differentiator.

---

## Decisions Made

1. **Historical data scope**: 2023-24 through 2025-26 (3 seasons) as the initial load. The NBA API throttles aggressively on per-game endpoints (~600 calls triggers timeouts), making large historical backfills impractical. 3 seasons provides enough data for all planned analytics features. Architecture supports expanding to 2010+ later if desired — just run the backfill for earlier seasons and rebuild dbt models.

2. **Per-game box scores dropped**: The per-game box score V3 endpoints (traditional, advanced, misc) require 3 API calls per game, causing throttling after ~200 games. `player_game_logs` and `team_game_logs` (loaded via season-level endpoints with no throttling) already contain per-game traditional stats and are sufficient for the analytics layer. The raw box score tables exist with V3 schemas but will remain empty.

3. **Update frequency**: Nightly batch processing during the NBA season. Simple, reliable, and totally sufficient for a portfolio/analytics platform. No real-time complexity.

4. **Tableau parallel track**: Yes. 2-3 Tableau Public dashboards built alongside the web app to cover job postings that specifically require Tableau/Power BI experience. Dashboards complement rather than duplicate the web features.

5. **Public API**: No. The API serves the frontend only. Keeps things simple and avoids the need for auth, rate limiting, and external documentation.

6. **Domain name / branding**: TBD. Will decide later, but the architecture supports dropping in a custom domain whenever ready.

7. **Blog component**: Yes, built into the Next.js site using MDX. Analytical write-ups using the platform's own data, serving as both content marketing and a demonstration of communication skills.

8. **Future expansion path**: When ready, expanding to 2010+ involves running the existing backfill script for earlier seasons, then running `dbt build` to rebuild transformations. Per-game box scores could be re-attempted with more aggressive batch resting (pause 60s every 50 games) if the advanced metrics are needed.

9. **Ingestion complete (2026-03-03)**: All three seasons (2023-24, 2024-25, 2025-26) are fully loaded — shots, PBP, game logs, reference data, season stats. The data foundation (Phase 1 Week 1-2 ETL work) is done. Next step is dbt project initialization.
