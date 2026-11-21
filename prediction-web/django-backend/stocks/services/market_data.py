"""Price history from Yahoo Finance, cached so repeat requests don't re-download."""
import logging
import re

import pandas as pd
import yfinance as yf
from django.conf import settings
from django.core.cache import cache

from core.errors import NotFound, UpstreamUnavailable

logger = logging.getLogger(__name__)

TICKER_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-=^]{0,14}$")
HISTORY_TTL = 30 * 60


def normalize_ticker(raw: str) -> str:
    return (raw or "").strip().upper()


def is_valid_ticker(ticker: str) -> bool:
    return bool(TICKER_RE.match(ticker))


def fetch_close_history(ticker: str) -> pd.Series:
    """Daily closing prices (split/dividend adjusted), oldest first."""
    key = f"stocks:history:{ticker}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    try:
        df = yf.download(
            ticker,
            period=f"{settings.STOCK_HISTORY_YEARS}y",
            interval="1d",
            auto_adjust=True,
            progress=False,
            multi_level_index=False,
            threads=False,
        )
    except Exception as exc:  # network errors, Yahoo rate limits
        logger.warning("yfinance download failed for %s: %s", ticker, exc)
        raise UpstreamUnavailable("Market data is temporarily unavailable. Please try again shortly.") from exc

    if df is None or df.empty or "Close" not in df:
        raise NotFound(f"No price data found for ticker '{ticker}'. Check the symbol and try again.")

    close = df["Close"].dropna().astype(float)
    close.index = pd.to_datetime(close.index).tz_localize(None)
    cache.set(key, close, HISTORY_TTL)
    return close


def fetch_currency(ticker: str) -> str | None:
    key = f"stocks:currency:{ticker}"
    cached = cache.get(key)
    if cached is not None:
        return cached or None
    try:
        currency = yf.Ticker(ticker).fast_info.get("currency")
    except Exception:  # metadata is optional
        currency = None
    cache.set(key, currency or "", 24 * 60 * 60)
    return currency
