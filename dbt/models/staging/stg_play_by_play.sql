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
            then nullif(score_home, '')::integer - nullif(score_away, '')::integer
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
