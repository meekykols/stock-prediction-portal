"""
Volleyball: set-by-set team ratings.

Every set is treated as a coin flip weighted by the two teams' ratings plus home advantage
(a Bradley–Terry model fitted on sets won, recent matches weighted more). A best-of-five
match then follows from the single-set chance: P(3-0) = p³, P(3-1) = 3p³(1-p), P(3-2) = 6p³(1-p)².
"""
import math

import numpy as np
from scipy.optimize import minimize

from core.errors import InsufficientData
from .common import Fitted, confidence, decay_weights, games_played, recent_form

HALF_LIFE_DAYS = 120
RIDGE = 1.0
MIN_MATCHES = 20
SETS_LINE = 3.5

MODEL_INFO = {
    "name": "Set ratings",
    "description": "A strength rating for every team from sets won this season and last, recent matches weighted more, turned into best-of-five match chances.",
}


def fit(history, as_of) -> Fitted:
    if len(history) < MIN_MATCHES:
        raise InsufficientData("Not enough finished matches in this competition to rate the teams yet.")
    teams = sorted({e["home"]["id"] for e in history} | {e["away"]["id"] for e in history})
    idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    hi = np.array([idx[e["home"]["id"]] for e in history])
    ai = np.array([idx[e["away"]["id"]] for e in history])
    sh = np.array([e["score"]["home"] for e in history], dtype=float)
    sa = np.array([e["score"]["away"] for e in history], dtype=float)
    w = np.array(decay_weights(history, as_of, HALF_LIFE_DAYS))
    ridge = RIDGE * w.mean()

    def nll(theta):
        h, r = theta[0], theta[1:]
        z = h + r[hi] - r[ai]
        p = 1 / (1 + np.exp(-z))
        ll = w * (sh * np.log(p) + sa * np.log(1 - p))
        resid = w * (sh * (1 - p) - sa * p)
        g = np.zeros_like(theta)
        g[0] = resid.sum()
        gr = np.zeros(n)
        np.add.at(gr, hi, resid)
        np.add.at(gr, ai, -resid)
        g[1:] = gr - 2 * ridge * r
        return -(ll.sum() - ridge * (r @ r)), -g

    theta = minimize(nll, np.zeros(1 + n), jac=True, method="L-BFGS-B").x
    ratings = theta[1:]
    return Fitted(
        sport="volleyball",
        params={"home": float(theta[0]), "rating": {t: float(ratings[i]) for t, i in idx.items()}, "default": float(np.quantile(ratings, 0.3))},
        history=history,
        as_of=as_of,
    )


def set_scores(p):
    """Probabilities of each final score in a best-of-five, from the home side's per-set chance."""
    q = 1 - p
    return {
        "3-0": p**3, "3-1": 3 * p**3 * q, "3-2": 6 * p**3 * q**2,
        "2-3": 6 * q**3 * p**2, "1-3": 3 * q**3 * p, "0-3": q**3,
    }


def predict(fitted: Fitted, event) -> dict:
    prm = fitted.params
    home_id, away_id = event["home"]["id"], event["away"]["id"]
    rh, ra = prm["rating"].get(home_id, prm["default"]), prm["rating"].get(away_id, prm["default"])
    p_set = 1 / (1 + math.exp(-(prm["home"] + rh - ra)))
    scores = set_scores(p_set)
    p_home = scores["3-0"] + scores["3-1"] + scores["3-2"]
    probs = {"home": p_home, "away": 1 - p_home}
    pick = max(probs, key=probs.get)
    allowed = ("3-0", "3-1", "3-2") if pick == "home" else ("2-3", "1-3", "0-3")
    best = max(allowed, key=scores.get)
    over = scores["3-1"] + scores["3-2"] + scores["2-3"] + scores["1-3"]  # four or five sets

    sample = min(games_played(fitted.history, home_id), games_played(fitted.history, away_id))
    r = lambda v: round(float(v), 4)  # noqa: E731
    return {
        "probabilities": {k: r(v) for k, v in probs.items()},
        "pick": {"market": "winner", "outcome": pick, "probability": r(probs[pick])},
        "predictedScore": {"home": int(best[0]), "away": int(best[2])},
        "markets": [
            {"key": "total", "line": SETS_LINE, "unit": "sets", "outcome": "over" if over >= 0.5 else "under", "probability": r(max(over, 1 - over))},
        ],
        "confidence": confidence(probs[pick], sample, high=0.72, medium=0.6, min_sample=5),
        "details": {
            "setWinChance": r(p_set),
            "setScores": [{"score": k, "probability": r(v)} for k, v in sorted(scores.items(), key=lambda kv: -kv[1])],
        },
        "inputs": {
            side: {"games": games_played(fitted.history, tid), "form": recent_form(fitted.history, tid)}
            for side, tid in (("home", home_id), ("away", away_id))
        },
    }
