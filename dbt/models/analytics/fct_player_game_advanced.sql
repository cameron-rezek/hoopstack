with player_games as (
    select * from {{ ref('stg_player_game_logs') }}
    where minutes_played > 0
),

team_games as (
    select
        game_id,
        team_id,
        minutes_played as team_minutes,
        field_goals_attempted as team_fga,
        free_throws_attempted as team_fta,
        offensive_rebounds as team_oreb,
        turnovers as team_tov,
        points as team_points
    from {{ ref('stg_team_game_logs') }}
),

joined as (
    select
        pg.season_id,
        pg.player_id,
        pg.player_name,
        pg.team_id,
        pg.team_abbreviation,
        pg.team_name,
        pg.game_id,
        pg.game_date,
        pg.matchup,
        pg.win_loss,
        pg.home_away,
        pg.minutes_played,
        pg.points,
        pg.field_goals_made,
        pg.field_goals_attempted,
        pg.field_goal_pct,
        pg.three_pointers_made,
        pg.three_pointers_attempted,
        pg.three_point_pct,
        pg.free_throws_made,
        pg.free_throws_attempted,
        pg.free_throw_pct,
        pg.offensive_rebounds,
        pg.defensive_rebounds,
        pg.total_rebounds,
        pg.assists,
        pg.steals,
        pg.blocks,
        pg.turnovers,
        pg.personal_fouls,
        pg.plus_minus,
        pg.season_type,

        tg.team_minutes,
        tg.team_fga,
        tg.team_fta,
        tg.team_oreb,
        tg.team_tov,
        tg.team_points,

        -- team possessions estimate
        tg.team_fga - tg.team_oreb + tg.team_tov + 0.44 * tg.team_fta as team_possessions
    from player_games pg
    inner join team_games tg
        on pg.game_id = tg.game_id
        and pg.team_id = tg.team_id
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
    season_type,

    -- true shooting percentage
    round(
        points / nullif(2.0 * (field_goals_attempted + 0.44 * free_throws_attempted), 0),
        3
    ) as true_shooting_pct,

    -- effective field goal percentage
    round(
        (field_goals_made + 0.5 * three_pointers_made) / nullif(field_goals_attempted::numeric, 0),
        3
    ) as effective_fg_pct,

    -- usage rate
    round(
        100.0 * (
            (field_goals_attempted + 0.44 * free_throws_attempted + turnovers)
            * (team_minutes / 5.0)
        ) / nullif(minutes_played * team_possessions, 0),
        1
    ) as usage_rate,

    -- assist percentage
    round(
        100.0 * assists * (team_minutes / 5.0)
        / nullif(minutes_played * (team_fga - field_goals_attempted), 0),
        1
    ) as assist_pct,

    -- turnover percentage
    round(
        100.0 * turnovers
        / nullif(field_goals_attempted + 0.44 * free_throws_attempted + turnovers, 0),
        1
    ) as turnover_pct,

    -- offensive rebound percentage
    round(
        100.0 * offensive_rebounds * (team_minutes / 5.0)
        / nullif(minutes_played * team_oreb, 0),
        1
    ) as offensive_rebound_pct,

    -- defensive rebound percentage
    round(
        100.0 * defensive_rebounds * (team_minutes / 5.0)
        / nullif(minutes_played * (total_rebounds - offensive_rebounds), 0),
        1
    ) as defensive_rebound_pct,

    -- game score (Hollinger)
    round(
        points
        + 0.4 * field_goals_made
        - 0.7 * field_goals_attempted
        - 0.4 * (free_throws_attempted - free_throws_made)
        + 0.7 * offensive_rebounds
        + 0.3 * defensive_rebounds
        + steals
        + 0.7 * assists
        + 0.7 * blocks
        - 0.4 * personal_fouls
        - turnovers,
        1
    ) as game_score,

    -- pace (possessions per 48 minutes of game time)
    -- team_minutes is total player-minutes (~240), divide by 5 for actual game time
    round(
        48.0 * team_possessions / nullif(team_minutes / 5.0, 0),
        1
    ) as pace

from joined
