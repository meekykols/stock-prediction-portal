import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { getJson } from './http.js';

// Bybit v5 linear (USDT) perpetuals, public endpoints only.
const base = () => env.exchanges.bybit;
const INTERVAL = { '1m': '1', '15m': '15', '1h': '60', '4h': '240' };

async function v5(path, params, ttl) {
  const r = await getJson(`${base()}${path}`, { category: 'linear', ...params }, ttl);
  if (r.retCode !== 0) throw new ApiError(422, r.retMsg || 'Bybit rejected the request', undefined, 'exchange_bad_request');
  return r.result;
}

export const bybit = {
  id: 'bybit',
  name: 'Bybit Futures',
  maxCandles: 1000,

  async symbols() {
    const out = new Map();
    let cursor;
    do {
      const r = await v5('/v5/market/instruments-info', { limit: 1000, ...(cursor && { cursor }) }, 3600e3);
      for (const s of r.list) {
        if (s.contractType === 'LinearPerpetual' && s.quoteCoin === 'USDT' && s.status === 'Trading') {
          out.set(s.symbol, { symbol: s.symbol, base: s.baseCoin, tickSize: +s.priceFilter.tickSize });
        }
      }
      cursor = r.nextPageCursor;
    } while (cursor);
    return out;
  },

  async price(symbol) {
    const r = await v5('/v5/market/tickers', { symbol }, 2000);
    return +r.list[0].lastPrice;
  },

  async klines(symbol, interval, { start, limit = 500 } = {}) {
    const r = await v5('/v5/market/kline', { symbol, interval: INTERVAL[interval], limit: Math.min(limit, this.maxCandles), ...(start && { start }) });
    // Bybit returns newest first.
    return r.list.map((k) => ({ t: Number(k[0]), o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] })).reverse();
  },

  async topByVolume(n) {
    const r = await v5('/v5/market/tickers', {}, 3600e3);
    return r.list.filter((t) => t.symbol.endsWith('USDT'))
      .sort((a, b) => +b.turnover24h - +a.turnover24h).slice(0, n)
      .map((t) => ({ symbol: t.symbol, quoteVolume: +t.turnover24h }));
  },
};
