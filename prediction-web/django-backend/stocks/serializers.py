from django.conf import settings
from rest_framework import serializers

from .services.market_data import is_valid_ticker, normalize_ticker


class StockPredictionRequest(serializers.Serializer):
    ticker = serializers.CharField(max_length=15)
    horizon = serializers.IntegerField(min_value=1, required=False, default=7)

    def validate_ticker(self, value):
        ticker = normalize_ticker(value)
        if not is_valid_ticker(ticker):
            raise serializers.ValidationError("Enter a valid ticker symbol, e.g. AAPL or MTNN.LG")
        return ticker

    def validate_horizon(self, value):
        if value > settings.STOCK_MAX_HORIZON:
            raise serializers.ValidationError(f"Horizon can be at most {settings.STOCK_MAX_HORIZON} days")
        return value
