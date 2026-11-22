import { env } from '../../config/env.js';
import { getJson } from './http.js';

// Binance USDⓈ-M perpetual futures, public endpoints only.
const base = () => env.exchanges.binance;
const toCandle = (k) => ({ t: Number(k[0]), o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] });

export const binance = {
  id: 'binance',
  name: 'Binance Futures',
  maxCandles: 1500,

  async symbols() {
    const info = await getJson(`${base()}/fapi/v1/exchangeInfo`, {}, 3600e3);
    return new Map(info.symbols
      .filter((s) => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map((s) => [s.symbol, { symbol: s.symbol, base: s.baseAsset, tickSize: +(s.filters.find((f) => f.filterType === 'PRICE_FILTER')?.tickSize ?? 0) }]));
  },

  async price(symbol) {
    const r = await getJson(`${base()}/fapi/v1/ticker/price`, { symbol }, 2000);
    return +r.price;
  },

  /** Candles in time order. interval: 1m | 15m | 1h | 4h. */
  async klines(symbol, interval, { start, limit = 500 } = {}) {
    const rows = await getJson(`${base()}/fapi/v1/klines`, { symbol, interval, limit: Math.min(limit, this.maxCandles), ...(start && { startTime: start }) });
    return rows.map(toCandle);
  },

  async topByVolume(n) {
    const [tickers, syms] = await Promise.all([getJson(`${base()}/fapi/v1/ticker/24hr`, {}, 3600e3), this.symbols()]);
    return tickers.filter((t) => syms.has(t.symbol))
      .sort((a, b) => +b.quoteVolume - +a.quoteVolume).slice(0, n)
      .map((t) => ({ symbol: t.symbol, quoteVolume: +t.quoteVolume }));
  },
};

