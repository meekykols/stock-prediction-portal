from django.conf import settings
from rest_framework import serializers

from .services.symbols import ASSET_CLASSES, resolve


class MarketRequest(serializers.Serializer):
    assetClass = serializers.ChoiceField(choices=ASSET_CLASSES, default="stock")
    symbol = serializers.CharField(max_length=30)

    def validate(self, attrs):
        # Raises InvalidSymbol (400, code invalid_symbol) with a message for the user.
        attrs["instrument"] = resolve(attrs["assetClass"], attrs["symbol"])
        return attrs


class MarketPredictionRequest(MarketRequest):
    horizon = serializers.IntegerField(min_value=1, required=False, default=7)

    def validate_horizon(self, value):
        if value > settings.STOCK_MAX_HORIZON:
            raise serializers.ValidationError(f"Horizon can be at most {settings.STOCK_MAX_HORIZON} days")
        return value
