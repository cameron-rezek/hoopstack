with source as (
    select * from {{ source('nba_raw', 'lineup_stats') }}
),

deduplicated as (
    select
        group_id,
        group_name,
        group_set,
        team_id,
        team_abbreviation,
        gp as games_played,
        w as wins,
        l as losses,
        w_pct as win_pct,
        min as minutes_per_game,
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
        tov as turnovers,
        stl as steals,
        blk as blocks,
        blka as blocks_against,
        pf as personal_fouls,
        pfd as personal_fouls_drawn,
        pts as points,
        plus_minus,
        season,
        season_type,
        row_number() over (
            partition by group_id, season, season_type
            order by ingested_at desc
        ) as rn
    from source
)

select
    group_id,
    group_name,
    group_set,
    team_id,
    team_abbreviation,
    games_played,
    wins,
    losses,
    win_pct,
    minutes_per_game,
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
    turnovers,
    steals,
    blocks,
    blocks_against,
    personal_fouls,
    personal_fouls_drawn,
    points,
    plus_minus,
    season,
    season_type
from deduplicated
where rn = 1
