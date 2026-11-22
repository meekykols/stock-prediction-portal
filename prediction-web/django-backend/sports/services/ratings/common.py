import math
from dataclasses import dataclass, field
from datetime import datetime, timezone


def ts(event) -> float:
    return datetime.fromisoformat(event["kickoff"].replace("Z", "+00:00")).timestamp()


def decay_weights(events, as_of: float, half_life_days: float):
    """Exponential time decay: a result `half_life_days` old counts half as much as today's."""
    k = math.log(2) / (half_life_days * 86400)
    return [math.exp(-k * max(0.0, as_of - ts(e))) for e in events]


def now() -> float:
    return datetime.now(timezone.utc).timestamp()


def norm_cdf(x: float) -> float:
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def recent_form(events, team_id, n=5):
    """Last n results for a team, newest last, as W/D/L."""
    out = []
    for e in sorted(events, key=ts):
        side = "home" if e["home"]["id"] == team_id else "away" if e["away"]["id"] == team_id else None
        if side is None or e.get("winner") is None:
            continue
        out.append("D" if e["winner"] == "draw" else "W" if e["winner"] == side else "L")
    return "".join(out[-n:])


def games_played(events, team_id):
    return sum(1 for e in events if team_id in (e["home"]["id"], e["away"]["id"]))


def confidence(probability: float, sample: int, *, high: float, medium: float, min_sample: int) -> str:
    if sample < min_sample:
        return "low"
    if probability >= high:
        return "high"
    return "medium" if probability >= medium else "low"


@dataclass
class Fitted:
    """A fitted league (or MMA) model plus the history it was fitted on."""

    sport: str
    params: dict
    history: list = field(default_factory=list)
    as_of: float = 0.0
