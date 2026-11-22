from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import StockPredictionRequest
from .services.lstm import run_prediction
from .services.market_data import fetch_close_history, fetch_currency

RESULT_TTL = 30 * 60


@api_view(["POST"])
def predict(request):
    params = StockPredictionRequest(data=request.data)
    params.is_valid(raise_exception=True)
    ticker = params.validated_data["ticker"]
    horizon = params.validated_data["horizon"]

    key = f"stocks:result:{ticker}:{horizon}"
    result = cache.get(key)
    if result is None:
        close = fetch_close_history(ticker)
        result = {"ticker": ticker, "currency": fetch_currency(ticker), **run_prediction(close, horizon)}
        cache.set(key, result, RESULT_TTL)

    return Response({"success": True, "data": result})
