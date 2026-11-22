from unittest import mock

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient


@override_settings(ML_SERVICE_API_KEY="secret", DEBUG=False)
class ServiceKeyTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_is_public(self):
        self.assertEqual(self.client.get("/health/").status_code, 200)

    def test_missing_key_rejected(self):
        res = self.client.post("/v1/markets/predict/", {"assetClass": "stock", "symbol": "AAPL"}, format="json")
        self.assertEqual(res.status_code, 401)
        self.assertFalse(res.json()["success"])

    def test_wrong_key_rejected(self):
        res = self.client.post("/v1/markets/predict/", {"assetClass": "stock", "symbol": "AAPL"}, format="json", HTTP_X_SERVICE_KEY="nope")
        self.assertEqual(res.status_code, 401)

    def test_invalid_symbol_is_400(self):
        res = self.client.post("/v1/markets/predict/", {"assetClass": "forex", "symbol": "EURO"}, format="json", HTTP_X_SERVICE_KEY="secret")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["code"], "invalid_symbol")

    def test_resolve_and_catalog(self):
        res = self.client.get("/v1/markets/resolve/", {"assetClass": "commodity", "symbol": "Gold"}, HTTP_X_SERVICE_KEY="secret")
        self.assertEqual(res.json()["data"]["symbol"], "GC=F")
        cat = self.client.get("/v1/markets/catalog/", HTTP_X_SERVICE_KEY="secret").json()["data"]
        self.assertEqual(set(cat), {"stock", "forex", "commodity", "crypto"})

    @override_settings(API_FOOTBALL_KEY="")
    def test_sports_without_key_is_503(self):
        res = self.client.get("/v1/sports/fixtures/", HTTP_X_SERVICE_KEY="secret")
        self.assertEqual(res.status_code, 503)
        self.assertEqual(res.json()["code"], "not_configured")

    @override_settings(API_FOOTBALL_KEY="k")
    def test_sports_predict_end_to_end_with_mocked_provider(self):
        fixture = {
            "id": 1, "kickoff": "2026-11-22T15:00:00+00:00", "status": {"short": "NS"},
            "league": {"id": 39, "season": 2026, "name": "Premier League"},
            "home": {"id": 10, "name": "Home FC"}, "away": {"id": 20, "name": "Away FC"},
        }
        stats = {
            "form": "WDWLW",
            "fixtures": {"played": {"home": 6, "away": 6, "total": 12}},
            "goals": {
                "for": {"average": {"home": "1.8", "away": "1.2", "total": "1.5"}},
                "against": {"average": {"home": "0.9", "away": "1.4", "total": "1.15"}},
            },
        }
        with mock.patch("sports.services.api_football.fixture", return_value=fixture), \
             mock.patch("sports.services.api_football.team_statistics", return_value=stats):
            res = self.client.post("/v1/sports/predict/", {"fixtureId": 1}, format="json", HTTP_X_SERVICE_KEY="secret")
        self.assertEqual(res.status_code, 200)
        body = res.json()["data"]
        self.assertIn("probabilities", body["prediction"])
        self.assertFalse(body["settled"])
