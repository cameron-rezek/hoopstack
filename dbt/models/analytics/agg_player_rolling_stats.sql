with games as (
    select
        *,
        row_number() over (
            partition by player_id, season_id, season_type
            order by game_date
        ) as season_game_number
    from {{ ref('fct_player_game_advanced') }}
),

rolling as (
    select
        season_id,
        player_id,
        player_name,
        team_id,
        team_abbreviation,
        team_name,
        game_id,
        game_date,
        season_game_number,
        season_type,

        -- current game values
        points,
        assists,
        total_rebounds,
        true_shooting_pct,
        usage_rate,
        plus_minus,
        game_score,

        -- rolling 5-game averages
        round(avg(points)       over w5, 1) as points_avg_5g,
        round(avg(assists)      over w5, 1) as assists_avg_5g,
        round(avg(total_rebounds) over w5, 1) as rebounds_avg_5g,
        round(avg(true_shooting_pct) over w5, 3) as ts_pct_avg_5g,
        round(avg(usage_rate)   over w5, 1) as usage_avg_5g,
        round(avg(plus_minus)   over w5, 1) as plus_minus_avg_5g,
        round(avg(game_score)   over w5, 1) as game_score_avg_5g,

        -- rolling 10-game averages
        round(avg(points)       over w10, 1) as points_avg_10g,
        round(avg(assists)      over w10, 1) as assists_avg_10g,
        round(avg(total_rebounds) over w10, 1) as rebounds_avg_10g,
        round(avg(true_shooting_pct) over w10, 3) as ts_pct_avg_10g,
        round(avg(usage_rate)   over w10, 1) as usage_avg_10g,
        round(avg(plus_minus)   over w10, 1) as plus_minus_avg_10g,
        round(avg(game_score)   over w10, 1) as game_score_avg_10g,

        -- rolling 20-game averages
        round(avg(points)       over w20, 1) as points_avg_20g,
        round(avg(assists)      over w20, 1) as assists_avg_20g,
        round(avg(total_rebounds) over w20, 1) as rebounds_avg_20g,
        round(avg(true_shooting_pct) over w20, 3) as ts_pct_avg_20g,
        round(avg(usage_rate)   over w20, 1) as usage_avg_20g,
        round(avg(plus_minus)   over w20, 1) as plus_minus_avg_20g,
        round(avg(game_score)   over w20, 1) as game_score_avg_20g,

        -- season-to-date averages
        round(avg(points)       over wseason, 1) as points_avg_season,
        round(avg(assists)      over wseason, 1) as assists_avg_season,
        round(avg(total_rebounds) over wseason, 1) as rebounds_avg_season,
        round(avg(true_shooting_pct) over wseason, 3) as ts_pct_avg_season,
        round(avg(usage_rate)   over wseason, 1) as usage_avg_season,
        round(avg(plus_minus)   over wseason, 1) as plus_minus_avg_season,
        round(avg(game_score)   over wseason, 1) as game_score_avg_season

    from games
    window
        w5  as (partition by player_id, season_id, season_type order by game_date rows between 4 preceding and current row),
        w10 as (partition by player_id, season_id, season_type order by game_date rows between 9 preceding and current row),
        w20 as (partition by player_id, season_id, season_type order by game_date rows between 19 preceding and current row),
        wseason as (partition by player_id, season_id, season_type order by game_date rows between unbounded preceding and current row)
)

select * from rolling
