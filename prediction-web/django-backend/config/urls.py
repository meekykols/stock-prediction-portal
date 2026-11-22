from django.urls import include, path

from core.views import health

urlpatterns = [
    path("health/", health),
    path("v1/markets/", include("markets.urls")),
    path("v1/sports/", include("sports.urls")),
]
