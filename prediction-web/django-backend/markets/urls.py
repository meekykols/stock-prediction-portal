from django.urls import path

from . import views

urlpatterns = [
    path("catalog/", views.catalog),
    path("resolve/", views.resolve),
    path("predict/", views.predict),
]
