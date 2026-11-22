import { CryptoConfig, CryptoSignal } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { advance, closeAtMarket, initialState, rewardRisk, validateLevels } from '../utils/signalMath.js';
import { exchange, resolveSymbol, roundToTick } from './exchanges/index.js';
import { getCurrentEntitlement } from './subscription.service.js';
import { notifySignal } from './telegram.service.js';

const HOUR = 3600e3;
const MINUTE = 60e3;
export const styleOf = (timeframe) => (timeframe === '15m' ? 'day' : 'swing');
const kindOf = (s) => (s.source === 'manual' ? 'manual' : s.style);
const notify = (signal, events) => notifySignal(signal, events).catch((err) => console.error('[crypto] notify failed:', err.message));

// ---------------------------------------------------------------- settings helpers

/** Coins the strategies watch: top N by futures volume and/or the fixed list. */
export async function universe() {
  const config = await CryptoConfig.getSingleton();
  const out = new Set();
  if (config.coins.top.enabled) {
    for (const t of await exchange(config.coins.top.exchange).topByVolume(config.coins.top.n)) out.add(t.symbol);
  }
  if (config.coins.fixed.enabled) config.coins.fixed.list.forEach((s) => out.add(s));
  return [...out];
}

export async function marketInfo(exchangeId, raw) {
  const info = await resolveSymbol(exchangeId, raw);
  return { ...info, exchange: exchangeId, price: await exchange(exchangeId).price(info.symbol) };
}

// ---------------------------------------------------------------- staff signals

export async function createManualSignal(input, user) {
  const config = await CryptoConfig.getSingleton();
  if (!config.enabled) throw ApiError.badRequest('Crypto signals are switched off in settings');
  if (config.paused.on && (!config.paused.until || config.paused.until > new Date())) {
    throw ApiError.badRequest(`Signals are paused${config.paused.reason ? `: ${config.paused.reason}` : ''}. Resume them in settings first.`);
  }
  if (!config.exchanges[input.exchange]) throw ApiError.badRequest(`${exchange(input.exchange).name} is switched off in settings`);
  const style = styleOf(input.timeframe);
  if (!config.styles[style].enabled) throw ApiError.badRequest(`${style === 'day' ? 'Day-trading' : 'Swing'} signals are switched off in settings`);

  const info = await resolveSymbol(input.exchange, input.symbol);
  const price = await exchange(input.exchange).price(info.symbol);
  const tick = (p) => roundToTick(p, info.tickSize);
  const entry = tick(input.entryType === 'market' ? price : input.entry);
  const levels = { side: input.side, entry, sl: tick(input.sl), tps: input.tps.map(tick) };

  const problem = validateLevels(levels);
  if (problem) throw new ApiError(422, problem, { levels: problem }, 'invalid_levels');
  if (input.entryType === 'limit') {
    const dist = Math.abs(entry / price - 1) * 100;
    if (dist > config.rules.maxEntryDistancePct) throw new ApiError(422, `Entry is ${dist.toFixed(1)}% from the current price (${price}). The limit is ${config.rules.maxEntryDistancePct}%.`, { entry: 'Too far from the current price' });
    const wrongSide = input.side === 'long' ? entry >= price : entry <= price;
    if (wrongSide) throw new ApiError(422, `A ${input.side} limit entry must be ${input.side === 'long' ? 'below' : 'above'} the current price (${price}). Use a market entry instead.`, { entry: 'Wrong side of the price' });
  }
  // A market long whose stop is already above the price (or short below) would be stopped at once.
  if (input.entryType === 'market' && validateLevels({ ...levels, entry: price })) {
    throw new ApiError(422, `The current price (${price}) is already past one of your levels.`, { levels: 'Past the current price' });
  }

  const now = Date.now();
  const state = initialState({ ...levels, entryType: input.entryType });
  const signal = await CryptoSignal.create({
    source: 'manual', style, exchange: input.exchange, symbol: info.symbol, base: info.base, timeframe: input.timeframe,
    side: input.side, entryType: input.entryType, ...levels, rr: rewardRisk(levels), note: input.note, createdBy: user._id, priceAtPost: price,
    ...state,
    feePct: config.rules.feePct,
    breakeven: config.rules.breakeven,
    // Start from the next whole minute: the current candle includes prices from before the post.
    lastCandleT: Math.floor(now / MINUTE) * MINUTE,
    filledAt: input.entryType === 'market' ? new Date(now) : undefined,
    expiresAt: input.entryType === 'limit' ? new Date(now + config.rules.limitExpiryHours[style] * HOUR) : undefined,
    maxHoldUntil: new Date(now + config.rules.maxHoldHours[style] * HOUR),
    events: [{ type: 'posted', at: new Date(now), price: entry }, ...(input.entryType === 'market' ? [{ type: 'filled', at: new Date(now), price: entry }] : [])],
  });
  notify(signal, [{ type: 'posted' }]);
  return signal;
}

export async function cancelSignal(id) {
  const signal = await CryptoSignal.findById(id);
  if (!signal) throw ApiError.notFound('Signal not found');
  let events;
  if (signal.status === 'pending') {
    signal.status = 'cancelled';
    signal.outcome = 'cancelled';
    signal.closedAt = new Date();
    events = [{ type: 'cancelled', at: new Date() }];
  } else if (signal.status === 'active') {
    const price = await exchange(signal.exchange).price(signal.symbol);
    const state = signal.toObject();
    ({ events } = closeAtMarket(state, price));
    Object.assign(signal, pick(state));
  } else {
    throw ApiError.badRequest('This signal is already finished');
  }
  signal.events.push(...events);
  await signal.save();
  notify(signal, events);
  return signal;
}

// ---------------------------------------------------------------- tracking

const STATE_FIELDS = ['status', 'stop', 'tpHit', 'remaining', 'realizedR', 'lastCandleT', 'filledAt', 'closedAt', 'outcome', 'resultR'];
const pick = (s) => Object.fromEntries(STATE_FIELDS.filter((k) => s[k] !== undefined).map((k) => [k, s[k]]));

let tracking = false;

/**
 * Every minute: replay closed 1-minute candles through each open signal. Runs too often to
 * record in JobRun, so it only logs when something happens.
 */
export async function trackSignals() {
  if (tracking) return { skipped: true };
  tracking = true;
  const run = { created: 0, failed: 0, errors: [] };
  try {
    const open = await CryptoSignal.find({ status: { $in: ['pending', 'active'] } });
    if (!open.length) return { open: 0, ...run };
    const groups = new Map();
    for (const s of open) {
      const k = `${s.exchange}|${s.symbol}`;
      groups.set(k, [...(groups.get(k) || []), s]);
    }
    const now = Date.now();
    for (const [k, signals] of groups) {
      const [exId, symbol] = k.split('|');
      const ex = exchange(exId);
      let from = Math.min(...signals.map((s) => s.lastCandleT ?? Date.parse(s.createdAt))) + MINUTE;
      try {
        // Page forward until caught up (after downtime there may be more than one page).
        while (from + MINUTE <= now) {
          const candles = (await ex.klines(symbol, '1m', { start: from, limit: ex.maxCandles }))
            .filter((c) => c.t >= from && c.t + MINUTE <= now); // closed candles only
          if (!candles.length) break;
          for (const signal of signals) {
            if (!['pending', 'active'].includes(signal.status)) continue;
            const state = signal.toObject();
            const { events } = advance(state, candles, { breakeven: signal.breakeven });
            Object.assign(signal, pick(state));
            if (events.length) {
              signal.events.push(...events);
              notify(signal, events);
              if (['closed', 'expired'].includes(signal.status)) run.created += 1;
            }
            await signal.save();
          }
          from = candles.at(-1).t + MINUTE;
          if (candles.length < ex.maxCandles) break;
        }
      } catch (err) {
        run.failed += signals.length;
        run.errors.push(`${exId} ${symbol}: ${err.message}`);
      }
    }
    if (run.created || run.errors.length) console.log(`[crypto] tracked ${open.length} open signal(s): ${run.created} finished${run.errors.length ? `; ${run.errors.join('; ')}` : ''}`);
    return { open: open.length, ...run };
  } finally {
    tracking = false;
  }
}

// ---------------------------------------------------------------- reading

async function allowedKinds(userId, config) {
  if (!userId) return new Set();
  const { plan } = await getCurrentEntitlement(userId);
  if (!plan) return new Set();
  return new Set(['manual', 'swing', 'day'].filter((k) => config.plans[k]?.includes(plan.slug)));
}

function lock(json) {
  return {
    id: json.id, source: json.source, style: json.style, exchange: json.exchange, timeframe: json.timeframe,
    status: json.status, createdAt: json.createdAt, rr: json.rr, locked: true,
  };
}

export async function trackRecord({ days = 30, filter = {} } = {}) {
  const since = new Date(Date.now() - days * 24 * HOUR);
  const rows = await CryptoSignal.aggregate([
    { $match: { status: 'closed', closedAt: { $gte: since }, ...filter } },
    {
      $group: {
        // Staff signals count as one kind whatever their timeframe; automatic ones by style.
        _id: { $cond: [{ $eq: ['$source', 'manual'] }, 'manual', '$style'] },
        n: { $sum: 1 },
        wins: { $sum: { $cond: [{ $gt: ['$resultR', 0] }, 1, 0] } },
        totalR: { $sum: '$resultR' },
        best: { $max: '$resultR' },
        worst: { $min: '$resultR' },
      },
    },
  ]);
  const shape = (r) => ({ n: r.n, wins: r.wins, winRate: r.n ? r.wins / r.n : null, totalR: Math.round(r.totalR * 100) / 100, avgR: r.n ? Math.round((r.totalR / r.n) * 1000) / 1000 : null });
  const all = rows.reduce((a, r) => ({ n: a.n + r.n, wins: a.wins + r.wins, totalR: a.totalR + r.totalR }), { n: 0, wins: 0, totalR: 0 });
  return {
    days,
    overall: shape(all),
    byKind: Object.fromEntries(rows.map((r) => [r._id, shape(r)])),
  };
}

export async function listForCustomer(userId, { view = 'live', kind } = {}) {
  const config = await CryptoConfig.getSingleton();
  const allowed = await allowedKinds(userId, config);
  const filter = view === 'closed'
    ? { status: { $in: ['closed', 'expired', 'cancelled'] }, closedAt: { $gte: new Date(Date.now() - 30 * 24 * HOUR) } }
    : { status: { $in: ['pending', 'active'] } };
  if (kind === 'manual') filter.source = 'manual';
  if (kind === 'swing' || kind === 'day') Object.assign(filter, { source: 'auto', style: kind });
  const [items, record] = await Promise.all([
    CryptoSignal.find(filter).sort(view === 'closed' ? { closedAt: -1 } : { createdAt: -1 }).limit(60).populate('createdBy', 'firstName'),
    trackRecord({ days: 30 }),
  ]);
  return {
    enabled: config.enabled,
    paused: config.paused.on ? { reason: config.paused.reason, until: config.paused.until } : null,
    access: { kinds: [...allowed], plans: config.plans },
    styles: { swing: config.styles.swing.enabled, day: config.styles.day.enabled },
    record,
    items: items.map((s) => {
      const json = { ...s.toJSON(), postedBy: s.createdBy?.firstName };
      delete json.createdBy;
      // Live signals are hidden from plans without access; finished ones are the public track record.
      return view === 'live' && !allowed.has(kindOf(s)) ? lock(json) : json;
    }),
  };
}

export async function adminList(query = {}) {
  const filter = {};
  if (query.view === 'open') filter.status = { $in: ['pending', 'active'] };
  if (query.view === 'finished') filter.status = { $in: ['closed', 'expired', 'cancelled'] };
  if (['manual', 'auto'].includes(query.source)) filter.source = query.source;
  if (query.symbol) filter.symbol = String(query.symbol).toUpperCase();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const [items, total] = await Promise.all([
    CryptoSignal.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('createdBy', 'firstName lastName'),
    CryptoSignal.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Results by staff member, for manual signals. */
export async function staffRecord({ days = 30 } = {}) {
  const since = new Date(Date.now() - days * 24 * HOUR);
  return CryptoSignal.aggregate([
    { $match: { source: 'manual', status: 'closed', closedAt: { $gte: since } } },
    { $group: { _id: '$createdBy', n: { $sum: 1 }, wins: { $sum: { $cond: [{ $gt: ['$resultR', 0] }, 1, 0] } }, totalR: { $sum: '$resultR' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $project: { n: 1, wins: 1, totalR: { $round: ['$totalR', 2] }, name: { $concat: [{ $arrayElemAt: ['$u.firstName', 0] }, ' ', { $arrayElemAt: ['$u.lastName', 0] }] } } },
    { $sort: { totalR: -1 } },
  ]);
}
