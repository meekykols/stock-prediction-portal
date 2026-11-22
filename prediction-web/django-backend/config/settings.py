"""
ML microservice settings.

Stateless by design: no database. Only the Express API calls this service,
authenticating with a shared key. Users, plans and saved predictions live in
MongoDB behind Express.
"""
import os
from pathlib import Path

from decouple import Csv, config

# Keras must know its backend before it is first imported.
os.environ.setdefault("KERAS_BACKEND", config("KERAS_BACKEND", default="jax"))

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = config("DEBUG", default=False, cast=bool)
SECRET_KEY = config("SECRET_KEY", default="dev-only-not-secret" if DEBUG else "")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set when DEBUG is False")

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="127.0.0.1,localhost", cast=Csv())

INSTALLED_APPS = [
    "rest_framework",
    "core",
    "markets",
    "sports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "ml-service",
        "OPTIONS": {"MAX_ENTRIES": 2000},
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["core.authentication.ServiceKeyAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["core.permissions.IsInternalService"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "UNAUTHENTICATED_USER": None,
    "EXCEPTION_HANDLER": "core.exceptions.exception_handler",
}

USE_TZ = True
TIME_ZONE = "UTC"

# --- Service config -------------------------------------------------------
ML_SERVICE_API_KEY = config("ML_SERVICE_API_KEY", default="")

# Trained on AAPL daily closes (Resources/stock_prediction_using_LSTM.ipynb); used for every market.
MARKET_MODEL_PATH = BASE_DIR / "ml_models" / "stock_lstm.keras"
STOCK_HISTORY_YEARS = 10
STOCK_MAX_HORIZON = 30

API_FOOTBALL_KEY = config("API_FOOTBALL_KEY", default="")
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"
SPORTS_LEAGUES = [int(x) for x in config("SPORTS_LEAGUES", default="39,140,135,78,61,2,3", cast=Csv())]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
