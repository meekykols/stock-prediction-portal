from . import elo, goals, points, sets
from .common import confidence

# Calibration power per sport, fitted by `manage.py backtest_sports --fit-calibration`.
# Probabilities are raised to this power and renormalised: below 1 pulls overconfident
# chances towards even, above 1 sharpens underconfident ones. 1.0 = no change.
# Fitted on the 2024 seasons (5 football leagues, NBA, NFL, SuperLega, UFC); all close to 1, so the
# raw models were already roughly honest. Refit as more seasons and live results come in.
CALIBRATION = {
    "football": 0.95,
    "basketball": 1.10,
    "american-football": 1.15,
    "volleyball": 1.0,
    "mma": 1.10,
}

# Confidence labels: (high, medium) thresholds on the calibrated pick chance, and the minimum
# number of games both sides need before anything is rated above "low".
CONFIDENCE = {
    "football": (0.60, 0.45, 5),
    "basketball": (0.72, 0.60, 5),
    "american-football": (0.72, 0.60, 5),
    "volleyball": (0.72, 0.60, 5),
    # MMA ratings showed no edge by confidence in testing, so tips are rarely rated above "low".
    "mma": (0.80, 0.68, 3),
}


def fit(sport, history, as_of):
    if sport == "football":
        return goals.fit(history, as_of)
    if sport in points.SETTINGS:
        return points.fit(sport, history, as_of)
    if sport == "volleyball":
        return sets.fit(history, as_of)
    if sport == "mma":
        return elo.fit(history, as_of)
    raise ValueError(f"unknown sport {sport}")


def module(sport):
    return {"football": goals, "volleyball": sets, "mma": elo}.get(sport, points)


def predict_raw(fitted, event):
    return module(fitted.sport).predict(fitted, event)


def calibrate(sport, prediction, power=None):
    """Applies the sport's calibration to a raw prediction (pick side never changes)."""
    a = CALIBRATION.get(sport, 1.0) if power is None else power
    probs = prediction["probabilities"]
    if a != 1.0:
        raw = {k: max(v, 1e-9) ** a for k, v in probs.items()}
        total = sum(raw.values())
        probs = {k: round(v / total, 4) for k, v in raw.items()}
    pick = max(probs, key=probs.get)
    high, medium, min_sample = CONFIDENCE[sport]
    inputs = prediction.get("inputs") or {}
    sample = min((inputs.get(s) or {}).get("games", 0) for s in ("home", "away"))
    return {
        **prediction,
        "probabilities": probs,
        "pick": {**prediction["pick"], "outcome": pick, "probability": probs[pick]},
        "confidence": confidence(probs[pick], sample, high=high, medium=medium, min_sample=min_sample),
    }


def predict(fitted, event):
    return calibrate(fitted.sport, predict_raw(fitted, event))


def model_info(sport):
    return module(sport).MODEL_INFO
