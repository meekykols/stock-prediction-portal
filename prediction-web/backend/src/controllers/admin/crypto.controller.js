import { CryptoConfig, Plan } from '../../models/index.js';
import * as crypto from '../../services/cryptoSignals.service.js';
import { exchange, resolveSymbol } from '../../services/exchanges/index.js';
import { telegramConfigured } from '../../services/telegram.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

export const config = asyncHandler(async (_req, res) => {
  const [doc, plans] = await Promise.all([CryptoConfig.getSingleton(), Plan.find({ isActive: true }).sort({ sortOrder: 1 }).select('name slug')]);
  res.json({ success: true, data: { config: doc, plans, telegramConfigured: telegramConfigured() } });
});

/** Deep-merges the nested settings, and checks the fixed coin list against the exchange. */
export const updateConfig = asyncHandler(async (req, res) => {
  const doc = await CryptoConfig.getSingleton();
  const merge = (path, value) => {
    if (value === undefined) return;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [k, v] of Object.entries(value)) merge(`${path}.${k}`, v);
    } else {
      doc.set(path, value);
    }
  };
  const list = req.body.coins?.fixed?.list;
  if (list) {
    const syms = await exchange('binance').symbols().catch(() => null);
    const bybitSyms = await exchange('bybit').symbols().catch(() => null);
    const clean = [...new Set(list.map((s) => (s.endsWith('USDT') ? s : `${s}USDT`)))];
    const unknown = syms && bybitSyms ? clean.filter((s) => !syms.has(s) && !bybitSyms.has(s)) : [];
    if (unknown.length) throw new ApiError(422, `Not a USDT perpetual on Binance or Bybit: ${unknown.join(', ')}`, { coins: unknown });
    req.body.coins.fixed.list = clean;
  }
  for (const [k, v] of Object.entries(req.body)) merge(k, v);
  await doc.save();
  res.json({ success: true, message: 'Crypto signal settings saved', data: doc });
});

export const universe = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await crypto.universe() });
});

export const market = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await crypto.marketInfo(req.query.exchange, req.query.symbol) });
});

export const candles = asyncHandler(async (req, res) => {
  const info = await resolveSymbol(req.query.exchange, req.query.symbol);
  const tf = ['15m', '1h', '4h'].includes(req.query.timeframe) ? req.query.timeframe : '1h';
  res.json({ success: true, data: { symbol: info.symbol, timeframe: tf, candles: await exchange(req.query.exchange).klines(info.symbol, tf, { limit: 150 }) } });
});

export const create = asyncHandler(async (req, res) => {
  const signal = await crypto.createManualSignal(req.body, req.user);
  res.status(201).json({ success: true, message: 'Signal posted', data: signal });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await crypto.adminList(req.query) });
});

export const cancel = asyncHandler(async (req, res) => {
  const signal = await crypto.cancelSignal(req.params.id);
  res.json({ success: true, message: signal.status === 'cancelled' ? 'Signal cancelled' : 'Trade closed at market', data: signal });
});

export const trackNow = asyncHandler(async (_req, res) => {
  const r = await crypto.trackSignals();
  res.json({ success: true, message: r.skipped ? 'A check is already running' : `Checked ${r.open} open signal(s)`, data: r });
});

export const stats = asyncHandler(async (_req, res) => {
  const [d30, d90, staff] = await Promise.all([crypto.trackRecord({ days: 30 }), crypto.trackRecord({ days: 90 }), crypto.staffRecord({ days: 90 })]);
  res.json({ success: true, data: { last30: d30, last90: d90, staff } });
});
