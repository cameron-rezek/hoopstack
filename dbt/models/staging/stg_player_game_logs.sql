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
        game_date,
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
