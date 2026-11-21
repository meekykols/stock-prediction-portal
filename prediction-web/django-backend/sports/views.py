from datetime import date, datetime, timezone

from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response

from core.errors import InsufficientData
from .serializers import FixturesQuery, SportsPredictionRequest
from .services import api_football, poisson

FINISHED = {"FT", "AET", "PEN"}


@api_view(["GET"])
def fixtures(request):
    query = FixturesQuery(data=request.query_params)
    query.is_valid(raise_exception=True)
    day = query.validated_data.get("date") or date.today()
    return Response({"success": True, "data": {"date": day.isoformat(), "fixtures": api_football.fixtures_on(day.isoformat())}})


@api_view(["POST"])
def predict(request):
    params = SportsPredictionRequest(data=request.data)
    params.is_valid(raise_exception=True)
    fixture_id = params.validated_data["fixtureId"]

    key = f"sports:result:{fixture_id}"
    result = cache.get(key)
    if result is None:
        fx = api_football.fixture(fixture_id)
        league_id, season = fx["league"]["id"], fx["league"]["season"]
        if not season:
            raise InsufficientData("This fixture has no season information to analyse.")

        home_stats = api_football.team_statistics(league_id, season, fx["home"]["id"])
        away_stats = api_football.team_statistics(league_id, season, fx["away"]["id"])
        home = poisson.team_profile(home_stats, "home")
        away = poisson.team_profile(away_stats, "away")

        result = {
            "fixture": fx,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "prediction": poisson.predict_match(home, away),
            "inputs": {"home": home, "away": away},
            "model": poisson.MODEL_INFO,
            "settled": fx["status"]["short"] in FINISHED,
        }
        cache.set(key, result, 30 * 60)

    return Response({"success": True, "data": result})
