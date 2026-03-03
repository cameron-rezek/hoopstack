with lineups as (
    select * from {{ ref('stg_lineup_stats') }}
),

computed as (
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
        season_type,

        -- effective field goal percentage (four factor 1)
        round(
            (field_goals_made + 0.5 * three_pointers_made)
            / nullif(field_goals_attempted, 0),
            3
        ) as effective_fg_pct,

        -- turnover percentage (four factor 2)
        round(
            100.0 * turnovers
            / nullif(field_goals_attempted + 0.44 * free_throws_attempted + turnovers, 0),
            1
        ) as turnover_pct,

        -- offensive rebound percentage (four factor 3)
        round(
            100.0 * offensive_rebounds
            / nullif(offensive_rebounds + defensive_rebounds, 0),
            1
        ) as offensive_rebound_pct,

        -- free throw rate (four factor 4)
        round(
            free_throws_attempted / nullif(field_goals_attempted, 0),
            3
        ) as free_throw_rate,

        -- estimated possessions per game
        round(
            (field_goals_attempted - offensive_rebounds + turnovers + 0.44 * free_throws_attempted)::numeric,
            1
        ) as estimated_possessions_per_game,

        -- total minutes across all games
        round((minutes_per_game * games_played)::numeric, 1) as total_minutes

    from lineups
)

select
    *,

    -- offensive rating (points per 100 possessions)
    round(
        100.0 * points / nullif(estimated_possessions_per_game, 0),
        1
    ) as offensive_rating,

    -- net rating per 100 possessions
    round(
        100.0 * plus_minus / nullif(estimated_possessions_per_game, 0),
        1
    ) as net_rating_per_100,

    -- sample size classification
    case
        when (minutes_per_game * games_played) < 50 then 'very_small'
        when (minutes_per_game * games_played) < 100 then 'small'
        when (minutes_per_game * games_played) < 200 then 'moderate'
        else 'reliable'
    end as sample_size_flag

from computed
