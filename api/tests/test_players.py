"""Player routes: not-found handling and the season format the warehouse expects."""

from api.routers import rolling as rolling_router
from api.routers import teams as teams_router
from api.routers.players import _season_to_year


async def test_get_player_returns_404_for_unknown_id(connection, client):
    connection.fetchrow_result = None  # no row for this player_id

    response = await client.get("/players/999999999")
    body = response.json()

    assert response.status_code == 404
    assert body["error"] == "not_found"
    assert body["message"] == "Player '999999999' not found"


async def test_get_player_returns_the_row_it_finds(connection, client):
    connection.fetchrow_result = {
        "player_id": 201939,
        "player_name": "Stephen Curry",
        "team_id": 1610612744,
        "team_abbreviation": "GSW",
        "team_name": "Golden State Warriors",
        "position": "G",
        "height": "6-2",
        "weight": "185",
        "jersey_number": "30",
        "is_active": True,
    }

    response = await client.get("/players/201939")

    assert response.status_code == 200
    assert response.json()["player_name"] == "Stephen Curry"


class TestSeasonFormatConversion:
    """
    The API speaks '2024-25'. The warehouse stores NBA season_id values like
    '22024' — a leading season-type digit ('2' = Regular Season) followed by
    the season's start year.

    The conversion is deliberately split: _season_to_year() takes the start
    year, and the SQL matches it with `season_id LIKE '%' || $n`. These tests
    pin both halves, because the helper alone looks wrong without the LIKE.
    """

    def test_extracts_the_start_year(self):
        assert _season_to_year("2024-25") == "2024"

    def test_handles_a_century_rollover(self):
        assert _season_to_year("1999-00") == "1999"

    def test_start_year_matches_the_regular_season_id(self):
        year = _season_to_year("2024-25")

        # What `season_id LIKE '%' || '2024'` resolves to in Postgres.
        assert "22024".endswith(year)

    def test_start_year_matches_the_playoff_season_id(self):
        """Season type varies in the leading digit; the year still matches."""
        year = _season_to_year("2024-25")

        assert "42024".endswith(year)

    def test_start_year_does_not_match_an_adjacent_season(self):
        year = _season_to_year("2024-25")

        assert not "22023".endswith(year)
        assert not "22025".endswith(year)

    def test_every_router_converts_identically(self):
        """
        players, teams and rolling each carry their own copy of this helper.
        If one drifts, the same season filter silently means different things
        on different endpoints.
        """
        season = "2024-25"
        conversions = {
            "players": _season_to_year(season),
            "teams": teams_router._season_to_year(season),
            "rolling": rolling_router._season_to_year(season),
        }

        assert set(conversions.values()) == {"2024"}, conversions
