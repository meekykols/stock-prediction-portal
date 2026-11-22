from django.urls import path

from . import views

urlpatterns = [
    path("fixtures/", views.fixtures),
    path("predict/", views.predict),
    path("events/", views.events),
    path("tips/", views.tips),
    path("leagues/", views.leagues),
]
