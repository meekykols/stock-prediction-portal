from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import MarketPredictionRequest, MarketRequest
from .services.lstm import run_prediction
from .services.market_data import fetch_close_history, fetch_currency
from .services.symbols import catalog as symbol_catalog

RESULT_TTL = 30 * 60


@api_view(["GET"])
def catalog(request):
    return Response({"success": True, "data": symbol_catalog()})


@api_view(["GET"])
def resolve(request):
    params = MarketRequest(data=request.query_params)
    params.is_valid(raise_exception=True)
    return Response({"success": True, "data": params.validated_data["instrument"].as_dict()})


@api_view(["POST"])
def predict(request):
    params = MarketPredictionRequest(data=request.data)
    params.is_valid(raise_exception=True)
    inst = params.validated_data["instrument"]
    horizon = params.validated_data["horizon"]

    key = f"markets:result:{inst.symbol}:{horizon}"
    result = cache.get(key)
    if result is None:
        close = fetch_close_history(inst.symbol, inst.display_name)
        currency = inst.currency or fetch_currency(inst.symbol)
        result = {
            **inst.as_dict(),
            "ticker": inst.symbol,
            "currency": currency,
            **run_prediction(close, horizon, calendar=inst.calendar),
        }
        cache.set(key, result, RESULT_TTL)

    return Response({"success": True, "data": result})
