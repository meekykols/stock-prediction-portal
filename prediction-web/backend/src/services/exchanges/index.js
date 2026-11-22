import { ApiError } from '../../utils/ApiError.js';
import { binance } from './binance.js';
import { bybit } from './bybit.js';

export const EXCHANGES = { binance, bybit };
export const TIMEFRAMES = ['15m', '1h', '4h'];

export function exchange(id) {
  const ex = EXCHANGES[id];
  if (!ex) throw ApiError.badRequest('Unknown exchange');
  return ex;
}

/** Normalises "btc", "BTC/USDT", "btcusdt" to BTCUSDT and checks it trades as a USDT perpetual. */
export async function resolveSymbol(exchangeId, raw) {
  const clean = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const symbol = clean.endsWith('USDT') ? clean : `${clean}USDT`;
  const syms = await exchange(exchangeId).symbols();
  const info = syms.get(symbol);
  if (!info) throw new ApiError(422, `${symbol} isn't a USDT perpetual on ${exchange(exchangeId).name}`, { symbol: 'Not listed on this exchange' }, 'invalid_symbol');
  return info;
}

/** Round a price to the contract's tick size. */
export function roundToTick(price, tickSize) {
  if (!tickSize) return price;
  const decimals = Math.max(0, Math.round(-Math.log10(tickSize)));
  return Number((Math.round(price / tickSize) * tickSize).toFixed(decimals));
}
