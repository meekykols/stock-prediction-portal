"""
Thin, cached client for API-Football v3 (https://www.api-football.com/documentation-v3).

The free tier allows ~100 requests/day, so every call is cached:
fixtures by date for 15 minutes, a single fixture for 10 minutes and
team statistics for 12 hours.
"""
from django.conf import settings

from core.errors import NotFound
from . import api_sports

TTL_FIXTURES = 15 * 60
TTL_FIXTURE = 10 * 60
TTL_TEAM_STATS = 12 * 60 * 60


def _get(path: str, params: dict, ttl: int):
    return api_sports.get("football", path, params, ttl)


def _normalize_fixture(item: dict) -> dict:
    fixture, league, teams = item["fixture"], item["league"], item["teams"]
    return {
        "id": fixture["id"],
        "kickoff": fixture.get("date"),
        "status": {
            "short": fixture.get("status", {}).get("short"),
            "long": fixture.get("status", {}).get("long"),
            "elapsed": fixture.get("status", {}).get("elapsed"),
        },
        "venue": (fixture.get("venue") or {}).get("name"),
        "league": {
            "id": league["id"],
            "name": league.get("name"),
            "country": league.get("country"),
            "logo": league.get("logo"),
            "round": league.get("round"),
            "season": league.get("season"),
        },
        "home": {k: teams["home"].get(k) for k in ("id", "name", "logo")},
        "away": {k: teams["away"].get(k) for k in ("id", "name", "logo")},
        "goals": item.get("goals") or {"home": None, "away": None},
    }


def fixtures_on(date_str: str) -> list[dict]:
    raw = _get("/fixtures", {"date": date_str, "timezone": "UTC"}, TTL_FIXTURES)
    leagues = set(settings.SPORTS_LEAGUES)
    items = [_normalize_fixture(f) for f in raw if not leagues or f["league"]["id"] in leagues]
    return sorted(items, key=lambda f: (f["kickoff"] or "", f["league"]["name"] or ""))


def fixture(fixture_id: int) -> dict:
    raw = _get("/fixtures", {"id": fixture_id}, TTL_FIXTURE)
    if not raw:
        raise NotFound("Fixture not found.")
    return _normalize_fixture(raw[0])


def team_statistics(league_id: int, season: int, team_id: int) -> dict:
    data = _get("/teams/statistics", {"league": league_id, "season": season, "team": team_id}, TTL_TEAM_STATS)
    # This endpoint returns an object, or [] when there is nothing for that season.
    return data if isinstance(data, dict) else {}
