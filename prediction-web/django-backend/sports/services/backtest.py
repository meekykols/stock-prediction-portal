"""
Walk-forward backtest for the sports rating models.

Each match day of the test season is predicted from a model fitted only on results before that
day, exactly as the live tips are produced. Reports accuracy, log loss, Brier score, a
calibration table (do 70% tips win about 70% of the time?) and results by confidence label.
"""
import math
from collections import defaultdict

from core.errors import ServiceError
from . import ratings
from .ratings.common import ts

BUCKETS = (0.0, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01)


def walk_forward(sport, train, test, calibrate=True):
    """Returns one record per decided test event: the prediction and what happened."""
    by_day = defaultdict(list)
    for e in test:
        by_day[e["date"]].append(e)
    history, out = list(train), []
    for day in sorted(by_day):
        games = by_day[day]
        try:
            fitted = ratings.fit(sport, history, min(ts(g) for g in games))
        except ServiceError:
            history += games
            continue
        for g in games:
            if g.get("winner") is None:
                continue
            p = ratings.predict(fitted, g) if calibrate else ratings.predict_raw(fitted, g)
            out.append({"event": g, "prediction": p})
        history += games
    return out


def report(records):
    n = len(records)
    if not n:
        return {"n": 0}
    hits = ll = brier = 0.0
    home = 0
    conf = defaultdict(lambda: [0, 0])
    buckets = defaultdict(lambda: [0, 0, 0.0])
    for r in records:
        p, e = r["prediction"], r["event"]
        win = e["winner"]
        ok = p["pick"]["outcome"] == win
        hits += ok
        home += win == "home"
        probs = p["probabilities"]
        ll += -math.log(max(1e-9, probs.get(win, 1e-9)))
        brier += sum((v - (k == win)) ** 2 for k, v in probs.items())
        c = conf[p["confidence"]]
        c[0] += 1
        c[1] += ok
        q = p["pick"]["probability"]
        b = next(i for i in range(len(BUCKETS) - 1) if BUCKETS[i] <= q < BUCKETS[i + 1])
        buckets[b][0] += 1
        buckets[b][1] += ok
        buckets[b][2] += q
    return {
        "n": n,
        "accuracy": hits / n,
        "homeRate": home / n,
        "logLoss": ll / n,
        "brier": brier / n,
        "byConfidence": {k: {"n": v[0], "accuracy": v[1] / v[0]} for k, v in conf.items()},
        # Expected (mean stated chance) vs actual hit rate per band.
        "calibration": [
            {"band": f"{BUCKETS[b]:.0%}–{min(BUCKETS[b + 1], 1):.0%}", "n": v[0], "stated": v[2] / v[0], "actual": v[1] / v[0]}
            for b, v in sorted(buckets.items())
        ],
        "calibrationError": sum(abs(v[2] - v[1]) for v in buckets.values()) / n,  # ECE
    }
