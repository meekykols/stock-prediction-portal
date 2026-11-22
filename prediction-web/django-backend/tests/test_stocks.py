import numpy as np
import pandas as pd
from django.test import SimpleTestCase

from core.errors import InsufficientData
from stocks.services.lstm import WINDOW, run_prediction


class PersistenceModel:
    """Predicts the last value of each window: lets us test the pipeline without Keras."""

    def predict(self, x):
        return np.asarray(x)[:, -1, 0]


def series(n=800):
    idx = pd.bdate_range("2022-01-03", periods=n)
    return pd.Series(100 + np.cumsum(np.random.default_rng(1).normal(0, 1, n)), index=idx)


class StockPipelineTests(SimpleTestCase):
    def test_shapes_and_metrics(self):
        close = series()
        result = run_prediction(close, horizon=5, model=PersistenceModel())
        test_len = len(close) - int(len(close) * 0.7)
        self.assertEqual(len(result["backtest"]["actual"]), test_len)
        self.assertEqual(len(result["backtest"]["predicted"]), test_len)
        self.assertEqual(len(result["history"]["close"]), len(close))
        self.assertEqual(len(result["forecast"]), 5)
        self.assertIsNone(result["history"]["ma100"][0])
        self.assertGreater(result["metrics"]["r2"], 0.8)

    def test_backtest_aligns_with_previous_close(self):
        close = series()
        result = run_prediction(close, horizon=1, model=PersistenceModel())
        split = int(len(close) * 0.7)
        # A persistence model predicts yesterday's close for each test day.
        self.assertAlmostEqual(result["backtest"]["predicted"][0], close.iloc[split - 1], places=2)

    def test_forecast_dates_are_business_days_after_last_close(self):
        result = run_prediction(series(), horizon=3, model=PersistenceModel())
        dates = pd.to_datetime([f["date"] for f in result["forecast"]])
        self.assertTrue(all(d.weekday() < 5 for d in dates))
        self.assertGreater(dates[0], pd.Timestamp(result["lastDate"]))

    def test_short_history_rejected(self):
        with self.assertRaises(InsufficientData):
            run_prediction(series(WINDOW + 50), horizon=1, model=PersistenceModel())
