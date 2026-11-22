"""
Bookmaker odds: consensus prices, implied chances and blending with our models.

For each event we take the median decimal price across bookmakers (robust to one stale book),
turn prices into chances (1 / odds) and remove the bookmaker margin proportionally so they add
up to 100%. The market is a strong forecaster, so tips combine it with the model:

    combined = weight * market + (1 - weight) * model

The weight is set in the admin console; the console's odds report measures which weight would
have scored best on settled tips, so it can be tuned from real results.
"""
from statistics import median

from . import api_sports

TTL_ODDS = 2 * 60 * 60
ODDS_PATH = {"football": ("/odds", "fixture"), "mma": ("/odds", "fight")}

# Bet names per sport, most preferred first. Two-way markets include overtime.
WINNER_BETS = {
    "football": ["Match Winner"],
    "basketball": ["Home/Away"],
    "american-football": ["Home/Away"],
    "volleyball": ["Home/Away", "Match Winner"],
    "mma": ["Home/Away", "Match Winner", "Winner"],
}
OUTCOME_NAMES = {"home": ("Home", "1"), "draw": ("Draw", "X"), "away": ("Away", "2")}


def _price(v):
    try:
        p = float(v)
    except (TypeError, ValueError):
        return None
    return p if p > 1.0 else None


def parse(sport: str, response: list) -> dict | None:
    """Consensus odds from an API-Sports odds response for one event."""
    if not response:
        return None
    books = response[0].get("bookmakers") or []
    winner, total, btts = {}, {}, {}
    for book in books:
        bets = {b.get("name"): b.get("values") or [] for b in book.get("bets") or []}
        for name in WINNER_BETS[sport]:
            if name in bets:
                for v in bets[name]:
                    for key, aliases in OUTCOME_NAMES.items():
                        if str(v.get("value")) in aliases and (p := _price(v.get("odd"))):
                            winner.setdefault(key, []).append(p)
                break
        if sport == "football":
            for v in bets.get("Goals Over/Under", []):
                if v.get("value") in ("Over 2.5", "Under 2.5") and (p := _price(v.get("odd"))):
                    total.setdefault(v["value"].split()[0].lower(), []).append(p)
            for v in bets.get("Both Teams Score", []):
                if v.get("value") in ("Yes", "No") and (p := _price(v.get("odd"))):
                    btts.setdefault(v["value"].lower(), []).append(p)

    needed = ("home", "draw", "away") if sport == "football" else ("home", "away")
    if not all(k in winner for k in needed):
        return None
    out = {
        "bookmakers": len(books),
        "winner": {k: round(median(winner[k]), 3) for k in needed},
    }
    if {"over", "under"} <= total.keys():
        out["total"] = {"line": 2.5, **{k: round(median(v), 3) for k, v in total.items()}}
    if {"yes", "no"} <= btts.keys():
        out["btts"] = {k: round(median(v), 3) for k, v in btts.items()}
    return out


def fetch(sport: str, event_id: int) -> dict | None:
    path, param = ODDS_PATH.get(sport, ("/odds", "game"))
    return parse(sport, api_sports.get(sport, path, {param: event_id}, TTL_ODDS))


def implied(prices: dict) -> tuple[dict, float]:
    """Margin-free chances from decimal prices, plus the bookmaker margin (overround)."""
    raw = {k: 1 / v for k, v in prices.items()}
    total = sum(raw.values())
    return {k: v / total for k, v in raw.items()}, total - 1


def blend(model: dict, market: dict, weight: float) -> dict:
    keys = market.keys()
    mixed = {k: weight * market[k] + (1 - weight) * model.get(k, 0.0) for k in keys}
    total = sum(mixed.values())
    return {k: v / total for k, v in mixed.items()}


def market_block(odds: dict) -> dict:
    probs, margin = implied(odds["winner"])
    block = {
        "probabilities": {k: round(v, 4) for k, v in probs.items()},
        "odds": odds["winner"],
        "bookmakers": odds["bookmakers"],
        "margin": round(margin, 4),
    }
    if "total" in odds:
        p, _ = implied({"over": odds["total"]["over"], "under": odds["total"]["under"]})
        block["total"] = {"line": 2.5, "odds": {"over": odds["total"]["over"], "under": odds["total"]["under"]}, "probabilities": {k: round(v, 4) for k, v in p.items()}}
    if "btts" in odds:
        p, _ = implied(odds["btts"])
        block["btts"] = {"odds": odds["btts"], "probabilities": {k: round(v, 4) for k, v in p.items()}}
    return block
