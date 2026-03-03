with shots as (
    select * from {{ ref('stg_shot_charts') }}
),

-- league-average FG% by zone (cross-season for sample stability)
zone_averages as (
    select
        shot_zone_basic,
        shot_zone_area,
        shot_zone_range,
        shot_type,
        count(*) as zone_attempts,
        avg(is_made::int) as zone_fg_pct
    from shots
    group by shot_zone_basic, shot_zone_area, shot_zone_range, shot_type
),

-- tag each shot with expected make probability
shots_tagged as (
    select
        s.player_id,
        s.player_name,
        s.team_id,
        s.team_name,
        s.season,
        s.season_type,
        s.shot_value,
        s.is_made,
        s.is_made::int * s.shot_value as actual_points,
        za.zone_fg_pct as expected_make_probability,
        za.zone_fg_pct * s.shot_value as expected_points
    from shots s
    inner join zone_averages za
        on s.shot_zone_basic = za.shot_zone_basic
        and s.shot_zone_area = za.shot_zone_area
        and s.shot_zone_range = za.shot_zone_range
        and s.shot_type = za.shot_type
)

-- aggregate to player-season level
select
    player_id,
    player_name,
    team_id,
    team_name,
    season,
    season_type,
    count(*) as total_shots,
    sum(is_made::int) as total_makes,
    round(avg(is_made::int)::numeric, 3) as fg_pct,
    round(sum(expected_points)::numeric, 1) as total_expected_points,
    round(sum(actual_points)::numeric, 1) as total_actual_points,
    round((sum(actual_points) - sum(expected_points))::numeric, 1) as total_points_above_expected,
    round(
        100.0 * (sum(actual_points) - sum(expected_points)) / nullif(count(*), 0),
        2
    ) as pax_per_100_shots,
    round(avg(expected_points)::numeric, 3) as shot_quality_score,
    round(
        ((sum(actual_points) - sum(expected_points)) / nullif(count(*), 0))::numeric,
        3
    ) as shot_making_score
from shots_tagged
group by player_id, player_name, team_id, team_name, season, season_type
