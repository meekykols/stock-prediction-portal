import numpy as np
import pandas as pd
from django.test import SimpleTestCase

from markets.services.ranges import likely_ranges, up_day_rate


def random_walk(n=2500, vol=0.01, seed=7):
    rng = np.random.default_rng(seed)
    # volatility regimes so the EWMA has something to track
    vols = np.where((np.arange(n) // 250) % 2, vol * 2, vol)
    r = rng.standard_t(5, n) / np.sqrt(5 / 3) * vols
    idx = pd.bdate_range("2014-01-01", periods=n)
    return pd.Series(100 * np.exp(np.cumsum(r)), index=idx)


class RangeTests(SimpleTestCase):
    def setUp(self):
        self.close = random_walk()
        self.dates = pd.bdate_range(self.close.index[-1] + pd.Timedelta(days=1), periods=5)

    def test_shape_and_nesting(self):
        r = likely_ranges(self.close, 5, self.dates, 2)
        self.assertEqual(len(r["days"]), 5)
        last = float(self.close.iloc[-1])
        for day in r["days"]:
            self.assertLess(day["p95"][0], day["p80"][0])
            self.assertLess(day["p80"][0], day["p50"][0])
            self.assertLess(day["p50"][0], last)
            self.assertGreater(day["p50"][1], last)
            self.assertLess(day["p80"][1], day["p95"][1])
        # ranges widen with the horizon
        self.assertGreater(r["days"][-1]["p80"][1] - r["days"][-1]["p80"][0], r["days"][0]["p80"][1] - r["days"][0]["p80"][0])

    def test_track_record_is_near_the_stated_level(self):
        tr = likely_ranges(self.close, 5, self.dates, 2)["trackRecord"]
        self.assertEqual(tr["level"], 0.8)
        self.assertGreater(tr["windows"], 500)
        self.assertAlmostEqual(tr["coverage"], 0.8, delta=0.06)

    def test_short_history_has_no_ranges(self):
        self.assertIsNone(likely_ranges(self.close.iloc[:200], 5, self.dates, 2))

    def test_up_day_rate(self):
        self.assertEqual(up_day_rate(np.array([1, 2, 2, 1, 3])), round(2 / 3, 4))
