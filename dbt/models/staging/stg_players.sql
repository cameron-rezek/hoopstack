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
