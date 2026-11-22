from django.conf import settings
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from markets.services.lstm import market_model


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    return Response({
        "success": True,
        "status": "ok",
        "marketModelLoaded": market_model.is_loaded,
        "sportsDataConfigured": bool(settings.API_FOOTBALL_KEY),
    })
