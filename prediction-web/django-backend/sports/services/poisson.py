"""
Poisson goals model.

Each side's expected goals blend its own scoring rate (at home / away) with the
opponent's conceding rate (away / at home). Scorelines are modelled as two
independent Poisson variables, which gives match result, over/under and
both-teams-to-score probabilities.
"""
import math

from core.errors import InsufficientData

MAX_GOALS = 10
MIN_SIDE_MATCHES = 3
XG_FLOOR, XG_CEIL = 0.2, 4.5

MODEL_INFO = {
    "name": "Poisson-xG",
    "description": "Independent Poisson model from season home/away scoring and conceding rates.",
}


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def team_profile(stats: dict, side: str) -> dict:
    """side: 'home' or 'away'. Falls back to season totals when the venue split is too small."""
    try:
        goals = stats["goals"]
        played = stats["fixtures"]["played"]
    except (KeyError, TypeError):
        raise InsufficientData("Not enough season statistics for one of the teams yet.")

    side_matches = played.get(side) or 0
    use_side = side_matches >= MIN_SIDE_MATCHES
    pick = side if use_side else "total"
    scored = _to_float(goals["for"]["average"].get(pick))
    conceded = _to_float(goals["against"]["average"].get(pick))
    matches = side_matches if use_side else (played.get("total") or 0)

    if scored is None or conceded is None or matches == 0:
        raise InsufficientData("Not enough season statistics for one of the teams yet.")

    return {
        "scored": scored,
        "conceded": conceded,
        "matches": int(matches),
        "basis": side if use_side else "season",
        "form": (stats.get("form") or "")[-5:],
    }


def _pmf(k: int, lam: float) -> float:
    return math.exp(-lam) * lam**k / math.factorial(k)


def predict_match(home: dict, away: dict) -> dict:
    clamp = lambda v: min(max(v, XG_FLOOR), XG_CEIL)  # noqa: E731
    xg_home = clamp((home["scored"] + away["conceded"]) / 2)
    xg_away = clamp((away["scored"] + home["conceded"]) / 2)

    ph = [_pmf(i, xg_home) for i in range(MAX_GOALS + 1)]
    pa = [_pmf(j, xg_away) for j in range(MAX_GOALS + 1)]
    grid = [[ph[i] * pa[j] for j in range(MAX_GOALS + 1)] for i in range(MAX_GOALS + 1)]
    total = sum(map(sum, grid))
    grid = [[p / total for p in row] for row in grid]

    cells = [(i, j, grid[i][j]) for i in range(MAX_GOALS + 1) for j in range(MAX_GOALS + 1)]
    home_win = sum(p for i, j, p in cells if i > j)
    draw = sum(p for i, j, p in cells if i == j)
    away_win = sum(p for i, j, p in cells if i < j)
    over25 = sum(p for i, j, p in cells if i + j >= 3)
    btts = sum(p for i, j, p in cells if i >= 1 and j >= 1)
    top_scores = sorted(cells, key=lambda c: c[2], reverse=True)[:5]

    outcomes = {"home": home_win, "draw": draw, "away": away_win}
    pick = max(outcomes, key=outcomes.get)

    sample = min(home["matches"], away["matches"])
    confidence = "low" if sample < 5 else "medium" if sample < 10 else "high"

    r = lambda v: round(v, 4)  # noqa: E731
    return {
        "expectedGoals": {"home": round(xg_home, 2), "away": round(xg_away, 2)},
        "probabilities": {"home": r(home_win), "draw": r(draw), "away": r(away_win)},
        "markets": {
            "over25": r(over25),
            "under25": r(1 - over25),
            "bttsYes": r(btts),
            "bttsNo": r(1 - btts),
        },
        "correctScores": [{"score": f"{i}-{j}", "probability": r(p)} for i, j, p in top_scores],
        "pick": {"outcome": pick, "probability": r(outcomes[pick])},
        "confidence": confidence,
    }
