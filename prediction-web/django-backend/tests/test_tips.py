import random
from datetime import datetime, timedelta, timezone
from unittest import mock

from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

from core.errors import InsufficientData
from sports.services import providers, ratings
from sports.services.api_sports import PlanRestricted
from sports.services.ratings import sets

START = datetime(2024, 8, 1, tzinfo=timezone.utc)


def event(sport, i, home, away, score=None, winner=None, league=1, days=0, state="finished"):
    return {
        "id": i, "sport": sport, "kickoff": (START + timedelta(days=days)).isoformat(), "date": "",
        "status": {"short": "FT", "long": "", "state": state},
        "league": {"id": league, "name": "Test League", "country": None, "logo": None, "season": 2024},
        "home": {"id": home, "name": f"T{home}", "logo": None}, "away": {"id": away, "name": f"T{away}", "logo": None},
        "score": score, "winner": winner, "extra": {},
    }


def winner_of(h, a):
    return "home" if h > a else "away" if a > h else "draw"


def league(sport, strengths, rounds=4, seed=1):
    """Round-robin results where stronger teams usually win."""
    rng = random.Random(seed)
    out, i = [], 0
    teams = list(strengths)
    for r in range(rounds):
        for h in teams:
            for a in teams:
                if h == a:
                    continue
                i += 1
                d = strengths[h] - strengths[a]
                if sport == "football":
                    sh, sa = max(0, round(1.4 + d + rng.gauss(0, 0.8))), max(0, round(1.1 - d + rng.gauss(0, 0.8)))
                elif sport == "volleyball":
                    p = 1 / (1 + 2.718 ** -(d * 2))
                    sh = sa = 0
                    while max(sh, sa) < 3:
                        if rng.random() < p:
                            sh += 1
                        else:
                            sa += 1
                else:
                    sh, sa = round(105 + 10 * d + rng.gauss(0, 8)), round(102 - 10 * d + rng.gauss(0, 8))
                    if sh == sa:
                        sh += 1
                out.append(event(sport, i, h, a, {"home": sh, "away": sa}, winner_of(sh, sa), days=r * 30 + i % 30))
    return out


STRENGTHS = {1: 1.0, 2: 0.4, 3: 0.0, 4: -0.4, 5: -1.0}
AS_OF = (START + timedelta(days=200)).timestamp()


class ModelTests(SimpleTestCase):
    def check_common(self, pred, two_way=True):
        probs = pred["probabilities"]
        self.assertAlmostEqual(sum(probs.values()), 1.0, places=3)
        self.assertEqual(set(probs), {"home", "away"} if two_way else {"home", "draw", "away"})
        self.assertIn(pred["confidence"], {"low", "medium", "high"})
        self.assertEqual(pred["pick"]["probability"], max(probs.values()))

    def test_football_favours_stronger_team_and_score_matches_pick(self):
        fitted = ratings.fit("football", league("football", STRENGTHS), AS_OF)
        pred = ratings.predict(fitted, event("football", 999, 1, 5, state="scheduled"))
        self.check_common(pred, two_way=False)
        self.assertEqual(pred["pick"]["outcome"], "home")
        self.assertGreater(pred["predictedScore"]["home"], pred["predictedScore"]["away"])
        self.assertEqual({m["key"] for m in pred["markets"]}, {"total", "btts"})
        self.assertLessEqual(fitted.params["rho"], 0.1)

    def test_football_unknown_team_gets_below_average_default(self):
        fitted = ratings.fit("football", league("football", STRENGTHS), AS_OF)
        pred = ratings.predict(fitted, event("football", 999, 3, 77, state="scheduled"))
        self.assertGreater(pred["probabilities"]["home"], pred["probabilities"]["away"])
        self.assertEqual(pred["inputs"]["away"]["games"], 0)
        self.assertEqual(pred["confidence"], "low")

    def test_points_model(self):
        for sport in ("basketball", "american-football"):
            fitted = ratings.fit(sport, league(sport, STRENGTHS), AS_OF)
            pred = ratings.predict(fitted, event(sport, 999, 5, 1, state="scheduled"))
            self.check_common(pred)
            self.assertEqual(pred["pick"]["outcome"], "away")
            self.assertGreater(pred["predictedScore"]["away"], pred["predictedScore"]["home"])
            self.assertTrue(str(pred["markets"][0]["line"]).endswith(".5"))

    def test_volleyball_set_scores_sum_to_one(self):
        self.assertAlmostEqual(sum(sets.set_scores(0.63).values()), 1.0, places=9)
        fitted = ratings.fit("volleyball", league("volleyball", STRENGTHS), AS_OF)
        pred = ratings.predict(fitted, event("volleyball", 999, 1, 4, state="scheduled"))
        self.check_common(pred)
        self.assertEqual(pred["pick"]["outcome"], "home")
        self.assertEqual(pred["predictedScore"]["home"], 3)

    def test_mma_elo_rewards_winners(self):
        fights = [event("mma", i, 10, 20 + i, winner="home", days=i) for i in range(6)]
        fights.append(event("mma", 50, 30, 40, winner="away", days=7))
        fitted = ratings.fit("mma", fights, AS_OF)
        pred = ratings.predict(fitted, event("mma", 999, 10, 99, state="scheduled"))
        self.check_common(pred)
        self.assertEqual(pred["pick"]["outcome"], "home")
        self.assertEqual(pred["inputs"]["home"]["record"], "6-0")
        self.assertIsNone(pred["predictedScore"])
        self.assertEqual(pred["confidence"], "low")  # opponent has no recorded fights

    def test_too_little_history(self):
        with self.assertRaises(InsufficientData):
            ratings.fit("football", league("football", STRENGTHS)[:5], AS_OF)


class ProviderTests(SimpleTestCase):
    def test_previous_season(self):
        self.assertEqual(providers.previous_season(2026), 2025)
        self.assertEqual(providers.previous_season("2026"), "2025")
        self.assertEqual(providers.previous_season("2026-2027"), "2025-2026")

    def test_football_uses_90_minute_score(self):
        raw = {
            "fixture": {"id": 1, "timestamp": 1795305600, "status": {"short": "AET", "long": "After extra time"}},
            "league": {"id": 2, "name": "UCL", "season": 2026},
            "teams": {"home": {"id": 1, "name": "A"}, "away": {"id": 2, "name": "B"}},
            "goals": {"home": 2, "away": 1}, "score": {"fulltime": {"home": 1, "away": 1}},
        }
        e = providers.normalize("football", [raw])[0]
        self.assertEqual(e["score"], {"home": 1, "away": 1})
        self.assertEqual(e["winner"], "draw")
        self.assertEqual(e["status"]["state"], "finished")
        self.assertEqual(e["date"], "2026-11-22")

    def test_american_football_shape_and_void_states(self):
        raw = {
            "game": {"id": 7, "date": {"timestamp": 1795305600}, "status": {"short": "PST", "long": "Postponed"}},
            "league": {"id": 1, "name": "NFL", "season": "2026", "country": {"name": "USA"}},
            "teams": {"home": {"id": 1, "name": "A"}, "away": {"id": 2, "name": "B"}},
            "scores": {"home": {"total": None}, "away": {"total": None}},
        }
        e = providers.normalize("american-football", [raw])[0]
        self.assertEqual((e["id"], e["status"]["state"], e["score"], e["league"]["country"]), (7, "void", None, "USA"))

    def test_mma_draw_is_void_and_names_are_repaired(self):
        raw = {
            "id": 3, "timestamp": 1795305600, "slug": "UFC", "status": {"short": "FT", "long": "Finished"},
            "fighters": {"first": {"id": 1, "name": "Gaston BolaÃ±os", "winner": False}, "second": {"id": 2, "name": "B", "winner": False}},
        }
        e = providers.normalize("mma", [raw])[0]
        self.assertEqual(e["status"]["state"], "void")
        self.assertIsNone(e["winner"])
        self.assertEqual(e["home"]["name"], "Gaston Bolaños")


@override_settings(ML_SERVICE_API_KEY="secret", API_FOOTBALL_KEY="k")
class TipsEndpointTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.history = league("football", STRENGTHS)
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat()
        self.day = tomorrow
        upcoming = [event("football", 900, 1, 5, state="scheduled", days=0), event("football", 901, 2, 3, state="scheduled")]
        other = event("football", 902, 1, 2, state="scheduled", league=42)
        restricted = event("football", 903, 1, 2, state="scheduled", league=7)
        self.events = upcoming + [other, restricted]

    def fake_history(self, sport, league_id, season, current=True):
        if league_id == 7:
            raise PlanRestricted("The football data plan does not cover this request.")
        return self.history if current else []

    def post(self, body):
        return self.client.post("/v1/sports/tips/", body, format="json", HTTP_X_SERVICE_KEY="secret")

    def test_tips_for_tracked_leagues_with_skips(self):
        with mock.patch.object(providers, "events_on", return_value=self.events), \
             mock.patch.object(providers, "history", side_effect=self.fake_history):
            res = self.post({"sport": "football", "date": self.day, "leagues": [1, 7]})
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual([t["event"]["id"] for t in data["tips"]], [900, 901])
        self.assertEqual(data["skipped"][0]["code"], "plan_restricted")
        self.assertEqual(data["model"]["name"], "Dixon–Coles")

    def test_rejects_unknown_sport_and_far_dates(self):
        self.assertEqual(self.post({"sport": "cricket", "date": self.day}).status_code, 400)
        self.assertEqual(self.post({"sport": "football", "date": "2020-01-01"}).status_code, 400)
