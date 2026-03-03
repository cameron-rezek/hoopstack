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
