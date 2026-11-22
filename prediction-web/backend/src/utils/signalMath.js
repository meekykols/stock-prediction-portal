/**
 * Trade-signal maths, kept pure so it can be unit-tested and reused by the backtester.
 *
 * Results are in R: multiples of the initial risk (|entry − stop-loss|). A trade that hits its
 * stop loses 1R; one that reaches a take-profit twice as far as the stop wins 2R.
 *
 * Exit rules (shown to customers):
 *  - The position is split equally across the take-profits (e.g. a third at each of TP1–TP3).
 *  - After TP1, the stop moves to the entry price (break-even) when `breakeven` is on.
 *  - If the stop and a take-profit fall inside the same 1-minute candle, the stop is assumed to
 *    have hit first (the cautious reading).
 *  - A limit entry not filled before `expiresAt` expires; an open trade is closed at the market
 *    when it reaches `maxHoldUntil`.
 *  - Fees: `feePct` per side (taker) is deducted from the result.
 */

export const dirOf = (side) => (side === 'long' ? 1 : -1);

/** Checks the levels make sense for the side. Returns an error message or null. */
export function validateLevels({ side, entry, sl, tps }) {
  const d = dirOf(side);
  if (!(entry > 0) || !(sl > 0) || !tps?.length) return 'Entry, stop-loss and at least one take-profit are required';
  if (d * (entry - sl) <= 0) return side === 'long' ? 'For a long, the stop-loss must be below the entry' : 'For a short, the stop-loss must be above the entry';
  let prev = entry;
  for (const [i, tp] of tps.entries()) {
    if (!(tp > 0) || d * (tp - prev) <= 0) {
      return side === 'long'
        ? `TP${i + 1} must be above ${i ? `TP${i}` : 'the entry'}`
        : `TP${i + 1} must be below ${i ? `TP${i}` : 'the entry'}`;
    }
    prev = tp;
  }
  return null;
}

/** Reward-to-risk of each take-profit, e.g. [1.5, 3]. */
export function rewardRisk({ side, entry, sl, tps }) {
  const risk = Math.abs(entry - sl);
  return tps.map((tp) => Math.round((dirOf(side) * (tp - entry) / risk) * 100) / 100);
}

const feeR = (s) => (2 * (s.feePct ?? 0) * s.entry) / Math.abs(s.entry - s.sl);
const rAt = (s, price) => (dirOf(s.side) * (price - s.entry)) / Math.abs(s.entry - s.sl);

function close(s, at, outcome, events) {
  s.status = 'closed';
  s.closedAt = at;
  s.outcome = outcome;
  s.resultR = Math.round((s.realizedR - feeR(s)) * 1000) / 1000;
  events.push({ type: 'closed', at, outcome, resultR: s.resultR });
}

/**
 * Advance a signal through 1-minute candles ({t, o, h, l, c}, oldest first, already closed).
 * Mutates and returns `s` plus the events that happened, for notifications.
 * State fields: status (pending|active|closed|expired|cancelled), stop, tpHit[], remaining,
 * realizedR, filledAt, lastCandleT.
 */
export function advance(s, candles, { breakeven = true } = {}) {
  const events = [];
  const d = dirOf(s.side);
  const share = 1 / s.tps.length;
  for (const k of candles) {
    if (s.lastCandleT != null && k.t <= s.lastCandleT) continue;
    s.lastCandleT = k.t;
    const end = k.t + 60_000;

    if (s.status === 'pending') {
      if (s.expiresAt && k.t >= new Date(s.expiresAt).getTime()) {
        s.status = 'expired';
        s.closedAt = new Date(k.t);
        s.outcome = 'expired';
        events.push({ type: 'expired', at: new Date(k.t) });
        break;
      }
      const touched = d === 1 ? k.l <= s.entry : k.h >= s.entry;
      if (!touched) continue;
      s.status = 'active';
      s.filledAt = new Date(k.t);
      events.push({ type: 'filled', at: new Date(k.t), price: s.entry });
      // Same candle: only the stop can be judged (we can't tell what came after the fill).
      if (d === 1 ? k.l <= s.stop : k.h >= s.stop) {
        s.realizedR += s.remaining * rAt(s, s.stop);
        s.remaining = 0;
        events.push({ type: 'stopped', at: new Date(k.t), price: s.stop });
        close(s, new Date(end), 'sl', events);
        break;
      }
      continue;
    }

    if (s.status !== 'active') break;

    // Stop first: the cautious assumption when both are inside one candle.
    if (d === 1 ? k.l <= s.stop : k.h >= s.stop) {
      s.realizedR += s.remaining * rAt(s, s.stop);
      s.remaining = 0;
      const hits = s.tpHit.filter(Boolean).length;
      events.push({ type: hits ? 'stopped_after_tp' : 'stopped', at: new Date(k.t), price: s.stop });
      close(s, new Date(end), hits ? `tp${hits}` : 'sl', events);
      break;
    }

    for (let i = 0; i < s.tps.length; i += 1) {
      if (s.tpHit[i]) continue;
      if (!(d === 1 ? k.h >= s.tps[i] : k.l <= s.tps[i])) break; // TPs are reached in order
      s.tpHit[i] = true;
      s.realizedR += share * rAt(s, s.tps[i]);
      s.remaining = Math.max(0, s.remaining - share);
      events.push({ type: 'tp', index: i + 1, at: new Date(k.t), price: s.tps[i] });
      if (i === 0 && breakeven && s.tps.length > 1) {
        s.stop = s.entry;
        events.push({ type: 'breakeven', at: new Date(k.t), price: s.entry });
      }
    }
    if (s.tpHit.every(Boolean)) {
      close(s, new Date(end), `tp${s.tps.length}`, events);
      break;
    }

    if (s.maxHoldUntil && end >= new Date(s.maxHoldUntil).getTime()) {
      s.realizedR += s.remaining * rAt(s, k.c);
      s.remaining = 0;
      const hits = s.tpHit.filter(Boolean).length;
      events.push({ type: 'time_exit', at: new Date(end), price: k.c });
      close(s, new Date(end), hits ? `tp${hits}` : 'time', events);
      break;
    }
  }
  return { signal: s, events };
}

/** Close an open trade at a given price (staff "close now"). */
export function closeAtMarket(s, price, at = new Date()) {
  const events = [];
  if (s.status === 'active') {
    s.realizedR += s.remaining * rAt(s, price);
    s.remaining = 0;
    events.push({ type: 'closed_by_staff', at, price });
    close(s, at, 'manual', events);
  }
  return { signal: s, events };
}

/** Fresh tracking state for a new signal. */
export function initialState({ side, entry, sl, tps, entryType }) {
  return {
    side, entry, sl, tps,
    stop: sl,
    tpHit: tps.map(() => false),
    remaining: 1,
    realizedR: 0,
    status: entryType === 'market' ? 'active' : 'pending',
  };
}
