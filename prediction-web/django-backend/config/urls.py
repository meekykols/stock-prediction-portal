from django.urls import include, path

from core.views import health

urlpatterns = [
    path("health/", health),
    path("v1/stocks/", include("stocks.urls")),
    path("v1/sports/", include("sports.urls")),
]
