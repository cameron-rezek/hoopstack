"""
X-API-Key enforcement.

verify_api_key is registered as an app-level dependency in api/main.py, so it
guards every route. It reads settings.api_key at call time, which is what makes
these tests possible without re-importing the app.
"""

import pytest


@pytest.mark.parametrize("api_key", ["super-secret"], indirect=True)
async def test_bad_api_key_returns_401(api_key, client):
    response = await client.get("/health", headers={"X-API-Key": "wrong-key"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or missing API key"


@pytest.mark.parametrize("api_key", ["super-secret"], indirect=True)
async def test_missing_api_key_returns_401_when_configured(api_key, client):
    response = await client.get("/health")

    assert response.status_code == 401


@pytest.mark.parametrize("api_key", ["super-secret"], indirect=True)
async def test_correct_api_key_is_accepted(api_key, client):
    response = await client.get("/health", headers={"X-API-Key": api_key})

    assert response.status_code == 200


@pytest.mark.parametrize("api_key", [""], indirect=True)
async def test_no_key_succeeds_when_api_key_is_empty(api_key, client):
    """Auth is opt-in: an unset API_KEY disables the check entirely."""
    response = await client.get("/health")

    assert response.status_code == 200


@pytest.mark.parametrize("api_key", [""], indirect=True)
async def test_stray_key_is_ignored_when_api_key_is_empty(api_key, client):
    """With auth disabled, a client sending a key is not punished for it."""
    response = await client.get("/health", headers={"X-API-Key": "anything"})

    assert response.status_code == 200
