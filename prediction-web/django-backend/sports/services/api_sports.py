"""
Cached client for the API-Sports family (football, basketball, american-football, mma, volleyball).

One key works for every sport, but each sport is a separate subscription with its own daily
quota, so every response is cached. Plan restrictions (e.g. "Free plans do not have access
to this season") come back as HTTP 200 with an `errors` object, and are raised as
`plan_restricted` so the caller can say why instead of failing silently.
"""
import logging

import requests
from django.conf import settings
from django.core.cache import cache

from core.errors import ServiceError, UpstreamUnavailable

logger = logging.getLogger(__name__)

HOSTS = {
    "football": "https://v3.football.api-sports.io",
    "basketball": "https://v1.basketball.api-sports.io",
    "american-football": "https://v1.american-football.api-sports.io",
    "mma": "https://v1.mma.api-sports.io",
    "volleyball": "https://v1.volleyball.api-sports.io",
}


class PlanRestricted(ServiceError):
    status_code = 503
    code = "plan_restricted"


def get(sport: str, path: str, params: dict, ttl: int, fresh: bool = False):
    """`fresh` skips the cached copy (results must be current) but still refreshes the cache."""
    if not settings.API_FOOTBALL_KEY:
        raise ServiceError("Sports data is not configured yet.", status_code=503, code="not_configured")

    key = f"as:{sport}:{path}:" + "&".join(f"{k}={params[k]}" for k in sorted(params))
    cached = None if fresh else cache.get(key)
    if cached is not None:
        return cached

    try:
        res = requests.get(
            (f"{settings.API_SPORTS_BASE_URL.rstrip('/')}/{sport}" if settings.API_SPORTS_BASE_URL else HOSTS[sport]) + path,
            params=params,
            headers={"x-apisports-key": settings.API_FOOTBALL_KEY},
            timeout=30,
        )
        res.raise_for_status()
        body = res.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("API-Sports %s %s failed: %s", sport, path, exc)
        raise UpstreamUnavailable("Sports data is temporarily unavailable. Please try again shortly.") from exc

    errors = body.get("errors")
    if errors:
        logger.warning("API-Sports %s %s %s returned errors: %s", sport, path, params, errors)
        if isinstance(errors, dict) and "plan" in errors:
            raise PlanRestricted(f"The {sport} data plan does not cover this request: {errors['plan']}")
        if isinstance(errors, dict) and "requests" in errors:
            raise UpstreamUnavailable(f"The daily {sport} data quota is used up. It resets at midnight UTC.")
        raise UpstreamUnavailable("The sports data provider rejected the request. Please try again later.")

    data = body.get("response", [])
    cache.set(key, data, ttl)
    return data
