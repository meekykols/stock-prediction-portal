"""
Daily tips: predict every upcoming event of one sport on one day.

Events are grouped by competition so each league is fitted once (cached for a few hours)
from this season's and last season's results. When bookmaker odds are switched on, each tip
also carries the market's view and the published chances combine the two. If a league can't
be fitted (e.g. the data plan doesn't cover the season) but odds exist, the tip falls back to
the bookmakers' consensus alone; otherwise the league is reported in `skipped`.
"""
import logging
from collections import defaultdict
from datetime import datetime, timezone

from django.conf import settings
from django.core.cache import cache

from core.errors import ServiceError
from . import odds as odds_svc
from . import providers, ratings
from .ratings.common import confidence, now

logger = logging.getLogger(__name__)

FIT_TTL = 3 * 60 * 60
MAX_VALUE_ODDS = 10.0  # long shots are too noisy to call "value"

MARKET_INFO = {
    "name": "Bookmaker consensus",
    "description": "The median price across bookmakers, turned into chances with their margin removed. Used when our model has no data for this competition yet.",
}


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


def _two_way(p_first, first, second):
    return {first: p_first, second: 1 - p_first}


def _side_markets(model_pred, market, weight):
    """Over/under 2.5 and both-teams-to-score: model, market or both, with the price of the chosen side."""
    out = []
    by_key = {m["key"]: m for m in (model_pred or {}).get("markets", [])}
    for key, first, second in (("total", "over", "under"), ("btts", "yes", "no")):
        model_m = by_key.get(key)
        market_m = (market or {}).get(key)
        if key == "total" and model_m and model_m.get("line") != 2.5:
            market_m = None  # basketball/volleyball lines don't match a 2.5 market
        if not model_m and not market_m:
            continue
        probs = None
        if model_m:
            p = model_m["probability"] if model_m["outcome"] == first else 1 - model_m["probability"]
            probs = _two_way(p, first, second)
        if market_m:
            probs = odds_svc.blend(probs, market_m["probabilities"], weight) if probs else market_m["probabilities"]
        outcome = max(probs, key=probs.get)
        m = {**(model_m or {"key": key, **({"line": 2.5, "unit": "goals"} if key == "total" else {})}), "outcome": outcome, "probability": round(probs[outcome], 4)}
        if market_m:
            m["odds"] = market_m["odds"][outcome]
        out.append(m)
    return out


def combine(sport, model_pred, odds, weight=0.6, value_edge=0.05):
    """One published prediction from the model, the bookmakers, or both."""
    market = odds_svc.market_block(odds) if odds else None
    if model_pred and market:
        probs, source = odds_svc.blend(model_pred["probabilities"], market["probabilities"], weight), "blend"
    elif model_pred:
        probs, source = model_pred["probabilities"], "model"
    else:
        probs, source = market["probabilities"], "market"
    probs = {k: round(v, 4) for k, v in probs.items()}
    pick = max(probs, key=probs.get)

    high, medium, min_sample = ratings.CONFIDENCE[sport]
    if model_pred:
        sample = min((model_pred.get("inputs", {}).get(s) or {}).get("games", 0) for s in ("home", "away"))
    else:
        sample = min_sample  # the market has seen every team
    out = {
        "probabilities": probs,
        "pick": {"market": "1x2" if sport == "football" else "winner", "outcome": pick, "probability": probs[pick]},
        # The model's score only stands if it agrees with the final pick.
        "predictedScore": model_pred["predictedScore"] if model_pred and model_pred["pick"]["outcome"] == pick else None,
        "markets": _side_markets(model_pred, market, weight) if sport == "football" else (model_pred or {}).get("markets", []),
        "confidence": confidence(probs[pick], sample, high=high, medium=medium, min_sample=min_sample),
        "details": (model_pred or {}).get("details", {}),
        "inputs": (model_pred or {}).get("inputs", {}),
        "source": source,
        "model": {"probabilities": model_pred["probabilities"]} if model_pred else None,
        "market": market,
        "value": None,
    }
    if market:
        out["pick"]["odds"] = market["odds"][pick]
    if model_pred and market:
        # "Value": our model rates an outcome clearly higher than the bookmakers do.
        edges = {k: model_pred["probabilities"].get(k, 0) - market["probabilities"][k] for k in market["probabilities"]}
        best = max(edges, key=edges.get)
        if edges[best] >= value_edge and market["odds"][best] <= MAX_VALUE_ODDS:
            out["value"] = {
                "outcome": best, "odds": market["odds"][best], "edge": round(edges[best], 4),
                "modelProbability": round(model_pred["probabilities"][best], 4), "marketProbability": market["probabilities"][best],
            }
    return out


def build_tips(sport: str, date_str: str, leagues=None, odds_cfg=None) -> dict:
    """odds_cfg: None to skip odds, or {"weight": 0-1, "max": calls per run, "valueEdge": 0-1}."""
    tracked = set(leagues if leagues is not None else settings.SPORTS_DEFAULT_LEAGUES.get(sport, []))
    events = [
        e for e in providers.events_on(sport, date_str)
        if e["status"]["state"] == "scheduled" and (sport == "mma" or not tracked or e["league"]["id"] in tracked)
    ]
    groups = defaultdict(list)
    for e in events:
        groups[(e["league"]["id"], e["league"]["season"])].append(e)

    calls_left = (odds_cfg or {}).get("max", 0)
    weight = (odds_cfg or {}).get("weight", 0.6)
    value_edge = (odds_cfg or {}).get("valueEdge", 0.05)
    model_info = ratings.model_info(sport)
    tips, skipped = [], []

    def get_odds(e):
        nonlocal calls_left
        if not odds_cfg or calls_left <= 0:
            return None
        calls_left -= 1
        try:
            return odds_svc.fetch(sport, e["id"])
        except ServiceError as exc:
            logger.info("No odds for %s %s: %s", sport, e["id"], exc)
            return None

    for (_league, _season), group in groups.items():
        try:
            fitted, fit_error = fitted_for(sport, group[0]), None
        except ServiceError as exc:
            fitted, fit_error = None, exc
        missing = 0
        for e in group:
            model_pred = ratings.predict(fitted, e) if fitted else None
            odds = get_odds(e)
            if not model_pred and not odds:
                missing += 1
                continue
            pred = combine(sport, model_pred, odds, weight, value_edge)
            info = model_info if pred["source"] == "model" else MARKET_INFO if pred["source"] == "market" else {
                "name": f"{model_info['name']} + bookmakers",
                "description": f"{model_info['description']} Combined with the bookmakers' consensus ({round(weight * 100)}% market weight).",
            }
            tips.append({"event": e, "prediction": pred, "model": info})
        if missing:
            reason = fit_error.message if fit_error else "No odds available"
            if fit_error and odds_cfg and calls_left <= 0:
                reason += " (odds limit for this run reached)"
            skipped.append({"league": group[0]["league"], "events": missing, "code": getattr(fit_error, "code", "no_odds"), "reason": reason})

    return {
        "sport": sport,
        "date": date_str,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": model_info,
        "tips": sorted(tips, key=lambda t: (t["event"]["kickoff"] or "", t["event"]["league"]["name"] or "")),
        "skipped": skipped,
        "oddsCallsUsed": (odds_cfg or {}).get("max", 0) - calls_left if odds_cfg else 0,
    }
