"""
Daily tips: predict every upcoming event of one sport on one day.

Events are grouped by competition so each league is fitted once (cached for a few hours)
from this season's and last season's results. A league that can't be fitted (e.g. the data
plan doesn't cover the season, or it's too early in the season) is reported in `skipped`
instead of failing the whole day.
"""
import logging
from collections import defaultdict
from datetime import datetime, timezone

from django.conf import settings
from django.core.cache import cache

from core.errors import ServiceError
from . import providers, ratings
from .ratings.common import now

logger = logging.getLogger(__name__)

FIT_TTL = 3 * 60 * 60


def _history(sport, league_id, season, kickoff_year):
    if sport == "mma":
        seasons = [kickoff_year, kickoff_year - 1, kickoff_year - 2]
        out = []
        for i, s in enumerate(seasons):
            out += providers.history("mma", None, s, current=i == 0)
        return out
    current = providers.history(sport, league_id, season, current=True)
    try:
        previous = providers.history(sport, league_id, providers.previous_season(season), current=False)
    except ServiceError as exc:
        logger.info("No previous season for %s league %s: %s", sport, league_id, exc)
        previous = []
    return previous + current


def fitted_for(sport, event):
    league_id, season = event["league"]["id"], event["league"]["season"]
    year = int((event["kickoff"] or "1970")[:4])
    key = f"fit:{sport}:{league_id}:{season if sport != 'mma' else year}"
    fitted = cache.get(key)
    if fitted is None:
        fitted = ratings.fit(sport, _history(sport, league_id, season, year), now())
        cache.set(key, fitted, FIT_TTL)
    return fitted


def build_tips(sport: str, date_str: str, leagues=None) -> dict:
    tracked = set(leagues if leagues is not None else settings.SPORTS_DEFAULT_LEAGUES.get(sport, []))
    events = [
        e for e in providers.events_on(sport, date_str)
        if e["status"]["state"] == "scheduled" and (sport == "mma" or not tracked or e["league"]["id"] in tracked)
    ]

    groups = defaultdict(list)
    for e in events:
        groups[(e["league"]["id"], e["league"]["season"])].append(e)

    tips, skipped = [], []
    for (league_id, _season), group in groups.items():
        try:
            fitted = fitted_for(sport, group[0])
        except ServiceError as exc:
            skipped.append({"league": group[0]["league"], "events": len(group), "code": exc.code, "reason": exc.message})
            continue
        for e in group:
            tips.append({"event": e, "prediction": ratings.predict(fitted, e)})

    return {
        "sport": sport,
        "date": date_str,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": ratings.model_info(sport),
        "tips": sorted(tips, key=lambda t: (t["event"]["kickoff"] or "", t["event"]["league"]["name"] or "")),
        "skipped": skipped,
    }
