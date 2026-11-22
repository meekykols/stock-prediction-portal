"""
Basketball and American football: offence/defence points ratings.

home points = mu + home_adv + offence[home] + defence[away]
away points = mu + offence[away] + defence[home]

Solved as a time-weighted ridge regression. The leftover spread of real margins and totals
around the predictions gives normal distributions for the winner and over/under markets.
"""
import math

import numpy as np

from core.errors import InsufficientData
from .common import Fitted, confidence, decay_weights, games_played, norm_cdf, recent_form

SETTINGS = {
    # Tuned by walk-forward backtest on the 2023-24 NBA and 2024 NFL seasons. `inflate` widens the
    # in-sample error spread, which understates how wrong the ratings are on unseen games.
    "basketball": {"half_life": 90, "ridge": 5.0, "min_games": 30, "inflate": 1.05},
    "american-football": {"half_life": 120, "ridge": 12.0, "min_games": 20, "inflate": 1.2},
}

MODEL_INFO = {
    "name": "Points ratings",
    "description": "Offence and defence ratings for every team from this season and last, recent games weighted more. Win chances come from how far real results have strayed from the ratings.",
}


def fit(sport, history, as_of) -> Fitted:
    cfg = SETTINGS[sport]
    if len(history) < cfg["min_games"]:
        raise InsufficientData("Not enough finished games in this competition to rate the teams yet.")
    teams = sorted({e["home"]["id"] for e in history} | {e["away"]["id"] for e in history})
    idx = {t: i for i, t in enumerate(teams)}
    n, m = len(teams), len(history)
    w = np.array(decay_weights(history, as_of, cfg["half_life"]))

    # Columns: mu, home_adv, offence[n], defence[n]. Two rows per game.
    X = np.zeros((2 * m, 2 + 2 * n))
    y = np.zeros(2 * m)
    for k, e in enumerate(history):
        h, a = idx[e["home"]["id"]], idx[e["away"]["id"]]
        X[2 * k, [0, 1, 2 + h, 2 + n + a]] = 1
        X[2 * k + 1, [0, 2 + a, 2 + n + h]] = 1
        y[2 * k], y[2 * k + 1] = e["score"]["home"], e["score"]["away"]
    W = np.repeat(w, 2)
    penalty = np.full(2 + 2 * n, cfg["ridge"] * w.mean())
    penalty[:2] = 0  # don't shrink the intercept or home advantage
    A = X.T @ (X * W[:, None]) + np.diag(penalty)
    beta = np.linalg.solve(A, X.T @ (W * y))

    pred = X @ beta
    margin_err = (y[0::2] - y[1::2]) - (pred[0::2] - pred[1::2])
    total_err = (y[0::2] + y[1::2]) - (pred[0::2] + pred[1::2])
    totals = y[0::2] + y[1::2]
    sd = lambda err: float(math.sqrt((w * err**2).sum() / w.sum()))  # noqa: E731

    return Fitted(
        sport=sport,
        params={
            "mu": float(beta[0]), "home": float(beta[1]),
            "offence": {t: float(beta[2 + i]) for t, i in idx.items()},
            "defence": {t: float(beta[2 + n + i]) for t, i in idx.items()},
            "sd_margin": max(sd(margin_err), 1.0) * cfg["inflate"],
            "sd_total": max(sd(total_err), 1.0) * cfg["inflate"],
            # Over/under line: the league's typical total, on a half point so it can't push.
            "line": math.floor(float((w * totals).sum() / w.sum())) + 0.5,
        },
        history=history,
        as_of=as_of,
    )


def predict(fitted: Fitted, event) -> dict:
    p, sport = fitted.params, fitted.sport
    home_id, away_id = event["home"]["id"], event["away"]["id"]
    off, dfn = p["offence"], p["defence"]
    pts_h = p["mu"] + p["home"] + off.get(home_id, 0.0) + dfn.get(away_id, 0.0)
    pts_a = p["mu"] + off.get(away_id, 0.0) + dfn.get(home_id, 0.0)
    margin, total = pts_h - pts_a, pts_h + pts_a

    p_home = norm_cdf(margin / p["sd_margin"])
    probs = {"home": p_home, "away": 1 - p_home}
    pick = max(probs, key=probs.get)
    over = 1 - norm_cdf((p["line"] - total) / p["sd_total"])

    # Round the predicted score without letting rounding flip or tie the winner.
    sh, sa = round(pts_h), round(pts_a)
    if (sh > sa) != (pick == "home") or sh == sa:
        sh, sa = (max(sh, sa + 1), sa) if pick == "home" else (sh, max(sa, sh + 1))

    sample = min(games_played(fitted.history, home_id), games_played(fitted.history, away_id))
    r = lambda v: round(float(v), 4)  # noqa: E731
    return {
        "probabilities": {k: r(v) for k, v in probs.items()},
        "pick": {"market": "winner", "outcome": pick, "probability": r(probs[pick])},
        "predictedScore": {"home": int(sh), "away": int(sa)},
        "markets": [
            {"key": "total", "line": p["line"], "unit": "points", "outcome": "over" if over >= 0.5 else "under", "probability": r(max(over, 1 - over))},
        ],
        "confidence": confidence(probs[pick], sample, high=0.72, medium=0.6, min_sample=5),
        "details": {
            "expectedPoints": {"home": round(pts_h, 1), "away": round(pts_a, 1)},
            "spread": round(margin, 1),
            "expectedTotal": round(total, 1),
        },
        "inputs": {
            side: {"games": games_played(fitted.history, tid), "form": recent_form(fitted.history, tid)}
            for side, tid in (("home", home_id), ("away", away_id))
        },
    }
