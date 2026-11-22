"""
LSTM price forecaster for any daily closing-price series (stocks, forex, commodities, crypto).

Mirrors the training notebook (Resources/stock_prediction_using_LSTM.ipynb):
a 100-day window of min-max scaled closing prices predicts the next close.
The model is loaded once per process and shared between requests.
"""
import logging
import math
import threading
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from django.conf import settings
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler

from core.errors import InsufficientData, UpstreamUnavailable

logger = logging.getLogger(__name__)

WINDOW = 100
TRAIN_RATIO = 0.70
MIN_HISTORY = 400  # enough for a 200-day average and a meaningful backtest

MODEL_INFO = {
    "name": "LSTM-100",
    "architecture": "LSTM(128) → LSTM(64) → Dense(25) → Dense(1)",
    "window": WINDOW,
    "trainedOn": "AAPL daily closes, 10 years",
    "notes": "Applied to every market after per-series scaling. Accuracy varies by instrument; check the backtest metrics before relying on a forecast.",
}


class PriceModel:
    def __init__(self, path):
        self._path = path
        self._model = None
        self._load_lock = threading.Lock()
        self._predict_lock = threading.Lock()

    @property
    def is_loaded(self):
        return self._model is not None

    def _get(self):
        if self._model is None:
            with self._load_lock:
                if self._model is None:
                    import keras  # imported lazily: slow, and needs KERAS_BACKEND set

                    if not self._path.exists():
                        raise UpstreamUnavailable("The price model file is missing on the server.")
                    logger.info("Loading price model from %s (backend=%s)", self._path, keras.backend.backend())
                    self._model = keras.saving.load_model(self._path)
        return self._model

    def predict(self, x: np.ndarray) -> np.ndarray:
        model = self._get()
        with self._predict_lock:
            return np.asarray(model.predict(x, batch_size=256, verbose=0)).reshape(-1)


market_model = PriceModel(settings.MARKET_MODEL_PATH)


def _digits(reference: float) -> int:
    """Decimal places that keep ~6 significant figures: 2 for $300, 5 for EUR/USD 1.08, 8 for tiny coins."""
    if not reference or math.isnan(reference):
        return 4
    return int(min(10, max(2, 5 - math.floor(math.log10(abs(reference))))))


def _round(values, ndigits=4):
    return [None if (v is None or (isinstance(v, float) and math.isnan(v))) else round(float(v), ndigits) for v in values]


def _dates(index):
    return [d.strftime("%Y-%m-%d") for d in index]


def _directional_accuracy(actual: np.ndarray, predicted: np.ndarray) -> float | None:
    """Share of days where the model called the up/down move correctly vs the previous actual close."""
    if len(actual) < 2:
        return None
    prev = actual[:-1]
    real_move = np.sign(actual[1:] - prev)
    pred_move = np.sign(predicted[1:] - prev)
    mask = real_move != 0
    if not mask.any():
        return None
    return float((real_move[mask] == pred_move[mask]).mean())


def run_prediction(close: pd.Series, horizon: int, model=market_model, calendar: str = "business") -> dict:
    if len(close) < MIN_HISTORY:
        raise InsufficientData(
            f"Not enough trading history ({len(close)} days). At least {MIN_HISTORY} days are needed."
        )

    split = int(len(close) * TRAIN_RATIO)
    training, testing = close.iloc[:split], close.iloc[split:]

    # Same preparation as the notebook: last 100 training days + test period, scaled together.
    final = pd.concat([training.tail(WINDOW), testing])
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(final.to_numpy().reshape(-1, 1)).reshape(-1)

    windows = np.lib.stride_tricks.sliding_window_view(scaled[:-1], WINDOW)
    x_test = windows.reshape(-1, WINDOW, 1)
    predicted_scaled = model.predict(x_test)
    predicted = scaler.inverse_transform(predicted_scaled.reshape(-1, 1)).reshape(-1)
    actual = testing.to_numpy()

    mse = mean_squared_error(actual, predicted)
    metrics = {
        "mse": float(f"{mse:.6g}"),
        "rmse": float(f"{math.sqrt(mse):.6g}"),
        "mae": float(f"{mean_absolute_error(actual, predicted):.6g}"),
        "mape": round(float(np.mean(np.abs((actual - predicted) / actual)) * 100), 3),
        "r2": round(float(r2_score(actual, predicted)), 4),
        "directionalAccuracy": _round([_directional_accuracy(actual, predicted)], 4)[0],
        "testDays": int(len(actual)),
    }

    # Recursive multi-day forecast: each predicted day feeds the next window.
    window = list(scaled[-WINDOW:])
    future_scaled = []
    for _ in range(horizon):
        nxt = float(model.predict(np.asarray(window[-WINDOW:]).reshape(1, WINDOW, 1))[0])
        future_scaled.append(nxt)
        window.append(nxt)
    future = scaler.inverse_transform(np.asarray(future_scaled).reshape(-1, 1)).reshape(-1)
    start = close.index[-1] + pd.Timedelta(days=1)
    # Crypto trades every day; everything else on weekdays.
    future_dates = pd.date_range(start, periods=horizon) if calendar == "daily" else pd.bdate_range(start, periods=horizon)
    nd = _digits(float(close.iloc[-1]))

    last_close = float(close.iloc[-1])
    prev_close = float(close.iloc[-2])
    final_forecast = float(future[-1]) if horizon else last_close

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "lastDate": close.index[-1].strftime("%Y-%m-%d"),
        "lastClose": round(last_close, nd),
        "dayChangePct": round((last_close / prev_close - 1) * 100, 3),
        "outlook": {
            "horizonDays": horizon,
            "targetPrice": round(final_forecast, nd),
            "changePct": round((final_forecast / last_close - 1) * 100, 3),
            "direction": "up" if final_forecast > last_close else "down" if final_forecast < last_close else "flat",
        },
        "history": {
            "dates": _dates(close.index),
            "close": _round(close.to_numpy(), nd),
            "ma100": _round(close.rolling(100).mean().to_numpy(), nd),
            "ma200": _round(close.rolling(200).mean().to_numpy(), nd),
        },
        "backtest": {
            "dates": _dates(testing.index),
            "actual": _round(actual, nd),
            "predicted": _round(predicted, nd),
        },
        "forecast": [
            {"date": d.strftime("%Y-%m-%d"), "price": round(float(p), nd)} for d, p in zip(future_dates, future)
        ],
        "metrics": metrics,
        "model": MODEL_INFO,
    }
