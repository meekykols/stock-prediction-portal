"""
What users type → the Yahoo Finance symbol we fetch.

  stock      AAPL, MTNN.LG, ^GSPC                → as typed (upper-cased)
  forex      EUR/USD, EURUSD, eur-usd, EURUSD=X  → EURUSD=X
  commodity  gold, Crude oil, GC=F               → GC=F   (curated list only)
  crypto     BTC, btc-usd, BTC/USD               → BTC-USD
"""
import re
from dataclasses import asdict, dataclass

from core.errors import ServiceError

ASSET_CLASSES = ("stock", "forex", "commodity", "crypto")

STOCKS = [
    ("AAPL", "Apple"), ("MSFT", "Microsoft"), ("NVDA", "NVIDIA"), ("TSLA", "Tesla"), ("AMZN", "Amazon"),
    ("GOOGL", "Alphabet"), ("META", "Meta"), ("MTNN.LG", "MTN Nigeria"), ("DANGCEM.LG", "Dangote Cement"),
]

FOREX = [
    ("EUR/USD", "Euro / US Dollar"), ("GBP/USD", "British Pound / US Dollar"), ("USD/JPY", "US Dollar / Japanese Yen"),
    ("USD/CHF", "US Dollar / Swiss Franc"), ("AUD/USD", "Australian Dollar / US Dollar"), ("USD/CAD", "US Dollar / Canadian Dollar"),
    ("NZD/USD", "New Zealand Dollar / US Dollar"), ("EUR/GBP", "Euro / British Pound"), ("USD/NGN", "US Dollar / Nigerian Naira"),
    ("USD/ZAR", "US Dollar / South African Rand"),
]

# (keyword, Yahoo futures symbol, display name, quote unit)
COMMODITIES = [
    ("gold", "GC=F", "Gold", "USD/oz"),
    ("silver", "SI=F", "Silver", "USD/oz"),
    ("platinum", "PL=F", "Platinum", "USD/oz"),
    ("copper", "HG=F", "Copper", "USD/lb"),
    ("crude oil", "CL=F", "Crude oil (WTI)", "USD/bbl"),
    ("brent", "BZ=F", "Brent crude", "USD/bbl"),
    ("natural gas", "NG=F", "Natural gas", "USD/MMBtu"),
    ("corn", "ZC=F", "Corn", "US¢/bu"),
    ("wheat", "ZW=F", "Wheat", "US¢/bu"),
    ("soybeans", "ZS=F", "Soybeans", "US¢/bu"),
    ("coffee", "KC=F", "Coffee", "US¢/lb"),
    ("cocoa", "CC=F", "Cocoa", "USD/t"),
]

CRYPTO = [
    ("BTC", "Bitcoin"), ("ETH", "Ethereum"), ("SOL", "Solana"), ("BNB", "BNB"), ("XRP", "XRP"), ("ADA", "Cardano"),
    ("DOGE", "Dogecoin"), ("AVAX", "Avalanche"), ("LINK", "Chainlink"), ("DOT", "Polkadot"), ("LTC", "Litecoin"), ("TRX", "TRON"),
]

STOCK_RE = re.compile(r"^\^?[A-Z0-9][A-Z0-9.\-]{0,14}$")
CCY_RE = re.compile(r"^[A-Z]{3}$")
CRYPTO_RE = re.compile(r"^[A-Z0-9]{2,10}$")


@dataclass(frozen=True)
class Instrument:
    asset_class: str
    symbol: str          # Yahoo Finance symbol
    display_name: str    # e.g. "EUR/USD", "Gold", "BTC/USD"
    currency: str | None # quote currency (None = look it up, stocks only)
    unit: str | None     # e.g. "USD/oz" for commodities
    calendar: str        # "daily" (trades every day) or "business"

    def as_dict(self):
        d = asdict(self)
        return {"assetClass": d.pop("asset_class"), "displayName": d.pop("display_name"), **d}


class InvalidSymbol(ServiceError):
    status_code = 400
    code = "invalid_symbol"


def _clean(raw: str) -> str:
    return re.sub(r"\s+", " ", (raw or "").strip())


def resolve(asset_class: str, raw: str) -> Instrument:
    if asset_class not in ASSET_CLASSES:
        raise InvalidSymbol("Choose stocks, forex, commodities or crypto.")
    text = _clean(raw)
    if not text:
        raise InvalidSymbol("Enter a symbol.")
    up = text.upper()

    if asset_class == "stock":
        if not STOCK_RE.match(up) or up.endswith("=X") or up.endswith("=F"):
            raise InvalidSymbol("Enter a stock ticker, e.g. AAPL or MTNN.LG.")
        return Instrument("stock", up, up, None, None, "business")

    if asset_class == "forex":
        pair = re.sub(r"=X$", "", up)
        pair = re.sub(r"[\s/\-_]", "", pair)
        base, quote = pair[:3], pair[3:]
        if len(pair) != 6 or not (CCY_RE.match(base) and CCY_RE.match(quote)) or base == quote:
            raise InvalidSymbol("Enter a currency pair, e.g. EUR/USD or GBPJPY.")
        return Instrument("forex", f"{base}{quote}=X", f"{base}/{quote}", quote, None, "business")

    if asset_class == "commodity":
        key = text.lower()
        for keyword, symbol, name, unit in COMMODITIES:
            if key in (keyword, symbol.lower(), name.lower()):
                return Instrument("commodity", symbol, name, "USD", unit, "business")
        names = ", ".join(c[2] for c in COMMODITIES[:6])
        raise InvalidSymbol(f"Choose a supported commodity, e.g. {names}.")

    # crypto
    base = re.sub(r"[\s/\-_]?(USD|USDT)$", "", up) if len(up) > 4 else up
    base = re.sub(r"[\s/\-_]", "", base)
    if not CRYPTO_RE.match(base):
        raise InvalidSymbol("Enter a coin symbol, e.g. BTC or ETH.")
    return Instrument("crypto", f"{base}-USD", f"{base}/USD", "USD", None, "daily")


def catalog() -> dict:
    """Suggestions shown in the app. Any valid stock, forex pair or coin also works."""
    return {
        "stock": [{"symbol": s, "name": n} for s, n in STOCKS],
        "forex": [{"symbol": s, "name": n} for s, n in FOREX],
        "commodity": [{"symbol": name, "name": f"{name} ({unit})", "yahoo": sym} for _k, sym, name, unit in COMMODITIES],
        "crypto": [{"symbol": s, "name": n} for s, n in CRYPTO],
    }
