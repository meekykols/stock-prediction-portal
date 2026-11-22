from datetime import date, datetime, timezone

from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response

from core.errors import InsufficientData, ServiceError
from .serializers import SPORT_CHOICES, EventsQuery, FixturesQuery, SportsPredictionRequest, TipsRequest
from .services import api_football, poisson, providers
from .services.tips import build_tips

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


@api_view(["GET"])
def events(request):
    """Every event of a sport on a day, with final scores once finished. Used to settle tips."""
    query = EventsQuery(data=request.query_params)
    query.is_valid(raise_exception=True)
    sport, day = query.validated_data["sport"], query.validated_data["date"].isoformat()
    return Response({"success": True, "data": {"sport": sport, "date": day, "events": providers.events_on(sport, day, fresh=True)}})


@api_view(["POST"])
def tips(request):
    params = TipsRequest(data=request.data)
    params.is_valid(raise_exception=True)
    v = params.validated_data
    return Response({"success": True, "data": build_tips(v["sport"], v["date"].isoformat(), v.get("leagues"), v.get("odds"))})


@api_view(["GET"])
def leagues(request):
    sport = request.query_params.get("sport")
    if sport not in SPORT_CHOICES:
        raise ServiceError("Unknown sport.", code="invalid_sport")
    return Response({"success": True, "data": {"sport": sport, "leagues": providers.leagues(sport)}})
