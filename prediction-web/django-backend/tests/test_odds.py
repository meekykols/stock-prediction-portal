from django.test import SimpleTestCase

from sports.services import odds as odds_svc
from sports.services.tips import combine


def book(name, home, draw, away, over=None, under=None):
    bets = [{"name": "Match Winner", "values": [{"value": "Home", "odd": str(home)}, {"value": "Draw", "odd": str(draw)}, {"value": "Away", "odd": str(away)}]}]
    if over:
        bets.append({"name": "Goals Over/Under", "values": [{"value": "Over 2.5", "odd": str(over)}, {"value": "Under 2.5", "odd": str(under)}, {"value": "Over 3.5", "odd": "3.1"}]})
    return {"name": name, "bets": bets}


RESPONSE = [{"bookmakers": [book("A", 2.0, 3.4, 4.0, 1.8, 2.0), book("B", 2.1, 3.3, 3.8, 1.9, 1.95), book("C", 9.9, 3.5, 4.2)]}]
MODEL = {
    "probabilities": {"home": 0.40, "draw": 0.25, "away": 0.35},
    "pick": {"market": "1x2", "outcome": "home", "probability": 0.40},
    "predictedScore": {"home": 1, "away": 0},
    "markets": [{"key": "total", "line": 2.5, "unit": "goals", "outcome": "under", "probability": 0.55}],
    "confidence": "low", "details": {}, "inputs": {"home": {"games": 20}, "away": {"games": 20}},
}


class OddsTests(SimpleTestCase):
    def test_parse_uses_median_and_ignores_other_lines(self):
        o = odds_svc.parse("football", RESPONSE)
        self.assertEqual(o["bookmakers"], 3)
        self.assertEqual(o["winner"], {"home": 2.1, "draw": 3.4, "away": 4.0})  # median ignores book C's stale 9.9
        self.assertEqual(o["total"], {"line": 2.5, "over": 1.85, "under": 1.975})
        self.assertNotIn("btts", o)

    def test_two_way_sports_and_missing_markets(self):
        resp = [{"bookmakers": [{"bets": [{"name": "Home/Away", "values": [{"value": "Home", "odd": "1.5"}, {"value": "Away", "odd": "2.6"}]}]}]}]
        self.assertEqual(odds_svc.parse("basketball", resp)["winner"], {"home": 1.5, "away": 2.6})
        self.assertIsNone(odds_svc.parse("football", resp))
        self.assertIsNone(odds_svc.parse("football", []))

    def test_implied_removes_margin(self):
        probs, margin = odds_svc.implied({"home": 1.9, "away": 1.9})
        self.assertAlmostEqual(probs["home"], 0.5)
        self.assertAlmostEqual(margin, 2 / 1.9 - 1)

    def test_market_only_tip(self):
        p = combine("football", None, odds_svc.parse("football", RESPONSE))
        self.assertEqual(p["source"], "market")
        self.assertEqual(p["pick"]["outcome"], "home")
        self.assertEqual(p["pick"]["odds"], 2.1)
        self.assertAlmostEqual(sum(p["probabilities"].values()), 1, places=3)
        self.assertIsNone(p["predictedScore"])
        self.assertEqual(p["markets"][0]["key"], "total")

    def test_blend_and_value(self):
        o = odds_svc.parse("football", RESPONSE)
        market = odds_svc.market_block(o)["probabilities"]
        p = combine("football", MODEL, o, weight=0.5, value_edge=0.03)
        self.assertEqual(p["source"], "blend")
        for k in ("home", "draw", "away"):
            self.assertAlmostEqual(p["probabilities"][k], (MODEL["probabilities"][k] + market[k]) / 2, places=3)
        self.assertEqual(p["model"]["probabilities"], MODEL["probabilities"])
        # model 35% away vs market ~25%: flagged as value at the away price
        self.assertEqual(p["value"]["outcome"], "away")
        self.assertEqual(p["value"]["odds"], 4.0)
        self.assertIsNone(combine("football", MODEL, o, weight=0.5, value_edge=0.2)["value"])

    def test_model_only_is_unchanged(self):
        p = combine("football", MODEL, None)
        self.assertEqual(p["source"], "model")
        self.assertEqual(p["probabilities"], MODEL["probabilities"])
        self.assertEqual(p["predictedScore"], {"home": 1, "away": 0})
        self.assertNotIn("odds", p["pick"])
