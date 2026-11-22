"""
Per-sport adapters that turn API-Sports payloads into one event shape:

    {id, sport, kickoff, date, status: {short, long, state}, league: {id, name, country, logo, season},
     home: {id, name, logo}, away: {...}, score: {home, away} | None, winner, extra}

`state` is scheduled | live | finished | void. `score` is the score that settles a bet:
football uses the 90-minute score, basketball and American football include overtime,
volleyball counts sets won. MMA has no score; `home` is the first fighter listed.
"""
from datetime import datetime, timezone

from . import api_sports

SPORTS = ("football", "basketball", "american-football", "volleyball", "mma")

TTL_EVENTS = 10 * 60
TTL_HISTORY_CURRENT = 6 * 60 * 60
TTL_HISTORY_PAST = 7 * 24 * 60 * 60

_STATES = {
    "football": ({"TBD", "NS"}, {"FT", "AET", "PEN"}, {"PST", "CANC", "ABD", "AWD", "WO"}),
    "basketball": ({"NS"}, {"FT", "AOT"}, {"POST", "CANC", "SUSP", "AWD", "ABD"}),
    "american-football": ({"NS"}, {"FT", "AOT"}, {"PST", "CANC"}),
    "volleyball": ({"NS"}, {"FT"}, {"POST", "CANC", "INTR", "ABD", "AWD"}),
    "mma": ({"NS"}, {"FT"}, {"PST", "CANC"}),
}


def _state(sport, short):
    scheduled, finished, void = _STATES[sport]
    if short in scheduled:
        return "scheduled"
    if short in finished:
        return "finished"
    if short in void:
        return "void"
    return "live"


def _text(value):
    """Some API-Sports names arrive double-encoded ("BolaÃ±os"); repair them when that's the case."""
    if not isinstance(value, str):
        return value
    try:
        return value.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value


def _team(t):
    t = t or {}
    return {"id": t.get("id"), "name": _text(t.get("name")), "logo": t.get("logo")}


def _winner(score):
    if not score or score["home"] is None or score["away"] is None:
        return None
    if score["home"] > score["away"]:
        return "home"
    return "away" if score["away"] > score["home"] else "draw"


def _iso(ts):
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat() if ts else None


def _finish(event):
    if event["status"]["state"] != "finished":
        event["score"] = None
    if event.get("winner") is None:
        event["winner"] = _winner(event["score"])
    event["date"] = (event["kickoff"] or "")[:10]
    return event


def _football(item):
    fx, lg = item["fixture"], item["league"]
    short = (fx.get("status") or {}).get("short")
    ft = (item.get("score") or {}).get("fulltime") or {}
    goals = item.get("goals") or {}
    score = {"home": ft.get("home", goals.get("home")), "away": ft.get("away", goals.get("away"))}
    return {
        "id": fx["id"], "sport": "football", "kickoff": _iso(fx.get("timestamp")) or fx.get("date"),
        "status": {"short": short, "long": (fx.get("status") or {}).get("long"), "state": _state("football", short)},
        "league": {"id": lg["id"], "name": lg.get("name"), "country": lg.get("country"), "logo": lg.get("logo"), "season": lg.get("season")},
        "home": _team(item["teams"]["home"]), "away": _team(item["teams"]["away"]),
        "score": score, "winner": None, "extra": {"round": lg.get("round")},
    }


def _games(sport):
    """Basketball, volleyball and American football share most of their shape."""

    def parse(item):
        game = item.get("game", item)  # American football nests id/date/status under `game`
        lg = item["league"]
        short = (game.get("status") or {}).get("short")
        date = game.get("date")
        ts = date.get("timestamp") if isinstance(date, dict) else game.get("timestamp")
        scores = item.get("scores") or {}
        if sport == "volleyball":
            score = {"home": scores.get("home"), "away": scores.get("away")}
        else:
            score = {"home": (scores.get("home") or {}).get("total"), "away": (scores.get("away") or {}).get("total")}
        country = item.get("country") or lg.get("country") or {}
        return {
            "id": game["id"], "sport": sport, "kickoff": _iso(ts),
            "status": {"short": short, "long": (game.get("status") or {}).get("long"), "state": _state(sport, short)},
            "league": {"id": lg["id"], "name": lg.get("name"), "country": country.get("name"), "logo": lg.get("logo"), "season": lg.get("season")},
            "home": _team(item["teams"]["home"]), "away": _team(item["teams"]["away"]),
            "score": score, "winner": None, "extra": {},
        }

    return parse


def _mma(item):
    short = (item.get("status") or {}).get("short")
    first, second = item["fighters"]["first"], item["fighters"]["second"]
    state = _state("mma", short)
    winner = "home" if first.get("winner") else "away" if second.get("winner") else None
    if state == "finished" and winner is None:
        state = "void"  # draw or no contest: bets on a winner are void
    return {
        "id": item["id"], "sport": "mma", "kickoff": _iso(item.get("timestamp")) or item.get("date"),
        "status": {"short": short, "long": (item.get("status") or {}).get("long"), "state": state},
        "league": {"id": 0, "name": _text(item.get("slug")) or "MMA", "country": None, "logo": None, "season": None},
        "home": _team({**first, "logo": first.get("logo")}), "away": _team({**second, "logo": second.get("logo")}),
        "score": None, "winner": winner if state == "finished" else None,
        "extra": {"category": item.get("category"), "isMain": bool(item.get("is_main"))},
    }


PARSERS = {
    "football": _football,
    "basketball": _games("basketball"),
    "american-football": _games("american-football"),
    "volleyball": _games("volleyball"),
    "mma": _mma,
}
EVENTS_PATH = {"football": "/fixtures", "mma": "/fights"}


def normalize(sport, items):
    out = []
    for item in items:
        try:
            out.append(_finish(PARSERS[sport](item)))
        except (KeyError, TypeError):
            continue  # skip malformed rows rather than failing the whole day
    return out


def events_on(sport: str, date_str: str, fresh: bool = False) -> list[dict]:
    params = {"date": date_str} if sport == "mma" else {"date": date_str, "timezone": "UTC"}
    raw = api_sports.get(sport, EVENTS_PATH.get(sport, "/games"), params, TTL_EVENTS, fresh=fresh)
    return sorted(normalize(sport, raw), key=lambda e: (e["kickoff"] or "", e["league"]["name"] or ""))


def previous_season(season):
    """2026 -> 2025, "2026" -> "2025", "2026-2027" -> "2025-2026"."""
    if season is None:
        return None
    text = str(season)
    if "-" in text:
        a, b = text.split("-", 1)
        return f"{int(a) - 1}-{int(b) - 1}"
    return int(text) - 1 if isinstance(season, int) else str(int(text) - 1)


def history(sport: str, league_id, season, current: bool = True) -> list[dict]:
    """Finished events of one league season (MMA: every fight of that year)."""
    ttl = TTL_HISTORY_CURRENT if current else TTL_HISTORY_PAST
    params = {"season": season} if sport == "mma" else {"league": league_id, "season": season}
    raw = api_sports.get(sport, EVENTS_PATH.get(sport, "/games"), params, ttl)
    return [e for e in normalize(sport, raw) if e["status"]["state"] == "finished" and e["score" if sport != "mma" else "winner"] is not None]


def leagues(sport: str) -> list[dict]:
    """Every competition the provider covers for a sport, for the admin's league picker."""
    if sport == "mma":
        return []
    raw = api_sports.get(sport, "/leagues", {}, 24 * 60 * 60)
    out = []
    for item in raw:
        lg = item.get("league", item)
        country = item.get("country") or {}
        out.append({"id": lg.get("id"), "name": _text(lg.get("name")), "type": lg.get("type"), "country": country.get("name"), "logo": lg.get("logo")})
    return sorted((x for x in out if x["id"] is not None), key=lambda x: (x["country"] or "", x["name"] or ""))
