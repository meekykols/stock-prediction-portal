"""
Football: Dixon–Coles goals model.

log(home goals rate) = mu + home_adv + attack[home] + defence[away]
log(away goals rate) = mu + attack[away] + defence[home]

Fitted by weighted maximum likelihood with time decay (recent matches count more) and a
small ridge penalty that pulls teams with few matches towards the league average. The
Dixon–Coles factor `rho` then corrects plain Poisson's under-counting of 0-0 and 1-1 draws.
"""
import math

import numpy as np
from scipy.optimize import minimize

from core.errors import InsufficientData
from .common import Fitted, confidence, decay_weights, games_played, recent_form

HALF_LIFE_DAYS = 180
RIDGE = 2.0
MAX_GOALS = 10
MIN_MATCHES = 20
TOTAL_LINE = 2.5

MODEL_INFO = {
    "name": "Dixon–Coles",
    "description": "Attack and defence ratings for every team, fitted on this season and last with recent matches weighted more, plus a correction for low-scoring draws.",
}


def fit(history, as_of) -> Fitted:
    if len(history) < MIN_MATCHES:
        raise InsufficientData("Not enough finished matches in this competition to rate the teams yet.")
    teams = sorted({e["home"]["id"] for e in history} | {e["away"]["id"] for e in history})
    idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    hi = np.array([idx[e["home"]["id"]] for e in history])
    ai = np.array([idx[e["away"]["id"]] for e in history])
    yh = np.array([e["score"]["home"] for e in history], dtype=float)
    ya = np.array([e["score"]["away"] for e in history], dtype=float)
    w = np.array(decay_weights(history, as_of, HALF_LIFE_DAYS))
    ridge = RIDGE * w.sum() / len(w) if len(w) else RIDGE

    def nll(theta):
        mu, h, att, dfn = theta[0], theta[1], theta[2:2 + n], theta[2 + n:]
        lh = mu + h + att[hi] + dfn[ai]
        la = mu + att[ai] + dfn[hi]
        eh, ea = np.exp(lh), np.exp(la)
        ll = w * (yh * lh - eh + ya * la - ea)
        r_h, r_a = w * (yh - eh), w * (ya - ea)
        g = np.zeros_like(theta)
        g[0] = r_h.sum() + r_a.sum()
        g[1] = r_h.sum()
        g_att, g_def = np.zeros(n), np.zeros(n)
        np.add.at(g_att, hi, r_h)
        np.add.at(g_att, ai, r_a)
        np.add.at(g_def, ai, r_h)
        np.add.at(g_def, hi, r_a)
        g[2:2 + n], g[2 + n:] = g_att - 2 * ridge * att, g_def - 2 * ridge * dfn
        value = ll.sum() - ridge * (att @ att + dfn @ dfn)
        return -value, -g

    theta0 = np.zeros(2 + 2 * n)
    theta0[0] = math.log(max(0.3, (yh @ w + ya @ w) / (2 * w.sum())))
    res = minimize(nll, theta0, jac=True, method="L-BFGS-B")
    theta = res.x
    mu, h, att, dfn = float(theta[0]), float(theta[1]), theta[2:2 + n], theta[2 + n:]

    lam_h = np.exp(mu + h + att[hi] + dfn[ai])
    lam_a = np.exp(mu + att[ai] + dfn[hi])
    rho = _fit_rho(yh, ya, lam_h, lam_a, w)

    return Fitted(
        sport="football",
        params={
            "mu": mu, "home": h, "rho": rho,
            "attack": {t: float(att[i]) for t, i in idx.items()},
            "defence": {t: float(dfn[i]) for t, i in idx.items()},
            # Unknown (e.g. newly promoted) teams start a little below average.
            "default_attack": float(np.quantile(att, 0.3)),
            "default_defence": float(np.quantile(dfn, 0.7)),
        },
        history=history,
        as_of=as_of,
    )


def _tau(i, j, lh, la, rho):
    if i == 0 and j == 0:
        return 1 - lh * la * rho
    if i == 0 and j == 1:
        return 1 + lh * rho
    if i == 1 and j == 0:
        return 1 + la * rho
    if i == 1 and j == 1:
        return 1 - rho
    return 1.0


def _fit_rho(yh, ya, lam_h, lam_a, w):
    low = (yh <= 1) & (ya <= 1)
    best, best_ll = 0.0, -math.inf
    for rho in np.arange(-0.2, 0.101, 0.01):
        taus = np.array([_tau(int(i), int(j), lh, la, rho) for i, j, lh, la in zip(yh[low], ya[low], lam_h[low], lam_a[low])])
        if (taus <= 0).any():
            continue
        ll = float((w[low] * np.log(taus)).sum())
        if ll > best_ll:
            best, best_ll = float(rho), ll
    return round(best, 2)


def _rates(p, home_id, away_id):
    att, dfn = p["attack"], p["defence"]
    ah, aa = att.get(home_id, p["default_attack"]), att.get(away_id, p["default_attack"])
    dh, da = dfn.get(home_id, p["default_defence"]), dfn.get(away_id, p["default_defence"])
    return math.exp(p["mu"] + p["home"] + ah + da), math.exp(p["mu"] + aa + dh)


def predict(fitted: Fitted, event) -> dict:
    p = fitted.params
    home_id, away_id = event["home"]["id"], event["away"]["id"]
    lh, la = _rates(p, home_id, away_id)
    pois = lambda k, lam: math.exp(-lam) * lam**k / math.factorial(k)  # noqa: E731
    grid = np.array([[pois(i, lh) * pois(j, la) * _tau(i, j, lh, la, p["rho"]) for j in range(MAX_GOALS + 1)] for i in range(MAX_GOALS + 1)])
    grid /= grid.sum()

    ii, jj = np.indices(grid.shape)
    home_win, draw, away_win = grid[ii > jj].sum(), grid[ii == jj].sum(), grid[ii < jj].sum()
    over = grid[ii + jj > TOTAL_LINE].sum()
    btts = grid[(ii >= 1) & (jj >= 1)].sum()
    flat = sorted(((grid[i, j], i, j) for i in range(MAX_GOALS + 1) for j in range(MAX_GOALS + 1)), reverse=True)

    probs = {"home": float(home_win), "draw": float(draw), "away": float(away_win)}
    pick = max(probs, key=probs.get)
    # The most likely scoreline consistent with the pick, so the score never contradicts the tip.
    score = next((i, j) for _, i, j in flat if (i > j, i == j, i < j)[("home", "draw", "away").index(pick)])

    sample = min(games_played(fitted.history, home_id), games_played(fitted.history, away_id))
    r = lambda v: round(float(v), 4)  # noqa: E731
    return {
        "probabilities": {k: r(v) for k, v in probs.items()},
        "pick": {"market": "1x2", "outcome": pick, "probability": r(probs[pick])},
        "predictedScore": {"home": int(score[0]), "away": int(score[1])},
        "markets": [
            {"key": "total", "line": TOTAL_LINE, "unit": "goals", "outcome": "over" if over >= 0.5 else "under", "probability": r(max(over, 1 - over))},
            {"key": "btts", "outcome": "yes" if btts >= 0.5 else "no", "probability": r(max(btts, 1 - btts))},
        ],
        "confidence": confidence(probs[pick], sample, high=0.6, medium=0.45, min_sample=5),
        "details": {
            "expectedGoals": {"home": round(lh, 2), "away": round(la, 2)},
            "correctScores": [{"score": f"{i}-{j}", "probability": r(v)} for v, i, j in flat[:5]],
        },
        "inputs": {
            side: {"games": games_played(fitted.history, tid), "form": recent_form(fitted.history, tid)}
            for side, tid in (("home", home_id), ("away", away_id))
        },
    }
