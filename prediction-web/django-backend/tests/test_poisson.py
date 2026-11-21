from django.test import SimpleTestCase

from core.errors import InsufficientData
from sports.services.poisson import predict_match, team_profile


def stats(home_for, home_against, away_for, away_against, home_n=8, away_n=8):
    return {
        "form": "WWDLW",
        "fixtures": {"played": {"home": home_n, "away": away_n, "total": home_n + away_n}},
        "goals": {
            "for": {"average": {"home": str(home_for), "away": str(away_for), "total": "1.5"}},
            "against": {"average": {"home": str(home_against), "away": str(away_against), "total": "1.2"}},
        },
    }


class PoissonTests(SimpleTestCase):
    def test_probabilities_sum_to_one(self):
        home = team_profile(stats(2.0, 0.8, 1.4, 1.1), "home")
        away = team_profile(stats(1.3, 1.2, 1.0, 1.6), "away")
        p = predict_match(home, away)["probabilities"]
        self.assertAlmostEqual(p["home"] + p["draw"] + p["away"], 1.0, places=3)

    def test_stronger_home_side_is_favoured(self):
        home = team_profile(stats(2.6, 0.5, 2.0, 0.9), "home")
        away = team_profile(stats(0.8, 2.0, 0.6, 2.4), "away")
        result = predict_match(home, away)
        self.assertEqual(result["pick"]["outcome"], "home")
        self.assertGreater(result["expectedGoals"]["home"], result["expectedGoals"]["away"])

    def test_small_venue_sample_falls_back_to_season(self):
        profile = team_profile(stats(3.0, 0.0, 1.0, 1.0, home_n=1), "home")
        self.assertEqual(profile["basis"], "season")
        self.assertEqual(profile["scored"], 1.5)

    def test_confidence_reflects_sample_size(self):
        home = team_profile(stats(1.5, 1.0, 1.2, 1.3, home_n=4, away_n=4), "home")
        away = team_profile(stats(1.5, 1.0, 1.2, 1.3, home_n=4, away_n=4), "away")
        self.assertEqual(predict_match(home, away)["confidence"], "low")

    def test_missing_stats_raise(self):
        with self.assertRaises(InsufficientData):
            team_profile({}, "home")
