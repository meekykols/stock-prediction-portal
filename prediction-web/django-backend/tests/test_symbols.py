from django.test import SimpleTestCase

from markets.services.symbols import InvalidSymbol, resolve


class SymbolTests(SimpleTestCase):
    def check(self, asset_class, raw, symbol, display=None):
        inst = resolve(asset_class, raw)
        self.assertEqual(inst.symbol, symbol)
        if display:
            self.assertEqual(inst.display_name, display)
        return inst

    def test_forex_formats(self):
        for raw in ("EUR/USD", "eurusd", "EUR-USD", "EURUSD=X", " eur usd "):
            inst = self.check("forex", raw, "EURUSD=X", "EUR/USD")
        self.assertEqual(inst.currency, "USD")
        self.assertEqual(self.check("forex", "usd/jpy", "USDJPY=X").currency, "JPY")

    def test_crypto_formats(self):
        for raw in ("BTC", "btc-usd", "BTC/USD", "btcusd", "BTCUSDT"):
            inst = self.check("crypto", raw, "BTC-USD", "BTC/USD")
        self.assertEqual(inst.calendar, "daily")

    def test_commodity_names_and_codes(self):
        self.check("commodity", "gold", "GC=F", "Gold")
        self.check("commodity", "Crude oil", "CL=F")
        self.check("commodity", "si=f", "SI=F", "Silver")
        self.assertEqual(resolve("commodity", "cocoa").unit, "USD/t")

    def test_stocks(self):
        self.check("stock", "aapl", "AAPL")
        self.check("stock", "mtnn.lg", "MTNN.LG")
        self.check("stock", "^gspc", "^GSPC")

    def test_rejections(self):
        bad = [("forex", "EURO"), ("forex", "USD/USD"), ("forex", "EUR/US1"), ("commodity", "unobtainium"),
               ("crypto", "B"), ("crypto", "BTC!"), ("stock", "$$$"), ("stock", "EURUSD=X"), ("stock", ""), ("bonds", "X")]
        for asset_class, raw in bad:
            with self.assertRaises(InvalidSymbol, msg=f"{asset_class}:{raw}"):
                resolve(asset_class, raw)
