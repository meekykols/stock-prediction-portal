from django.urls import path

from . import views

urlpatterns = [
    path("fixtures/", views.fixtures),
    path("predict/", views.predict),
]
