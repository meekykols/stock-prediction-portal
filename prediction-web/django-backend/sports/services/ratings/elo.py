"""
MMA: Elo ratings for fighters.

Every fighter starts at 1500 and gains or loses points after each fight, more for an upset.
Fighters with few recorded fights are rated close to 1500, so their tips are marked low
confidence.
"""
from .common import Fitted, confidence, ts

START = 1500.0
K = 64.0  # tuned by walk-forward backtest on 2024 (log loss 0.676 vs 0.680 at 40)
MIN_FIGHTS = 2

MODEL_INFO = {
    "name": "Elo",
    "description": "Fighter ratings updated after every recorded fight in the last three years, with bigger swings for upsets.",
}


def expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))


def fit(history, as_of) -> Fitted:
    rating, fights, record = {}, {}, {}
    for e in sorted(history, key=ts):
        a, b = e["home"]["id"], e["away"]["id"]
        ra, rb = rating.get(a, START), rating.get(b, START)
        score = 1.0 if e["winner"] == "home" else 0.0
        delta = K * (score - expected(ra, rb))
        rating[a], rating[b] = ra + delta, rb - delta
        for fid, won in ((a, score == 1.0), (b, score == 0.0)):
            fights[fid] = fights.get(fid, 0) + 1
            w, l = record.get(fid, (0, 0))
            record[fid] = (w + won, l + (not won))
    return Fitted(sport="mma", params={"rating": rating, "fights": fights, "record": record}, history=history, as_of=as_of)


def predict(fitted: Fitted, event) -> dict:
    p = fitted.params
    a, b = event["home"]["id"], event["away"]["id"]
    ra, rb = p["rating"].get(a, START), p["rating"].get(b, START)
    p_home = expected(ra, rb)
    probs = {"home": p_home, "away": 1 - p_home}
    pick = max(probs, key=probs.get)
    sample = min(p["fights"].get(a, 0), p["fights"].get(b, 0))
    r = lambda v: round(float(v), 4)  # noqa: E731

    def side(fid, elo):
        w, l = p["record"].get(fid, (0, 0))
        return {"games": p["fights"].get(fid, 0), "record": f"{w}-{l}", "rating": round(elo)}

    return {
        "probabilities": {k: r(v) for k, v in probs.items()},
        "pick": {"market": "winner", "outcome": pick, "probability": r(probs[pick])},
        "predictedScore": None,
        "markets": [],
        "confidence": confidence(probs[pick], sample, high=0.7, medium=0.6, min_sample=MIN_FIGHTS),
        "details": {"ratings": {"home": round(ra), "away": round(rb)}},
        "inputs": {"home": side(a, ra), "away": side(b, rb)},
    }
