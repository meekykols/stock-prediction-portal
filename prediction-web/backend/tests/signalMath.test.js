import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, closeAtMarket, initialState, rewardRisk, validateLevels } from '../src/utils/signalMath.js';

const T0 = Date.parse('2026-11-22T10:00:00Z');
const k = (i, o, h, l, c) => ({ t: T0 + i * 60_000, o, h, l, c });
const long = (extra = {}) => ({ ...initialState({ side: 'long', entry: 100, sl: 95, tps: [105, 110], entryType: 'market' }), feePct: 0, ...extra });

test('level checks for longs and shorts', () => {
  assert.equal(validateLevels({ side: 'long', entry: 100, sl: 95, tps: [105, 110] }), null);
  assert.match(validateLevels({ side: 'long', entry: 100, sl: 101, tps: [105] }), /below the entry/);
  assert.match(validateLevels({ side: 'long', entry: 100, sl: 95, tps: [105, 104] }), /TP2 must be above TP1/);
  assert.equal(validateLevels({ side: 'short', entry: 100, sl: 104, tps: [96, 90] }), null);
  assert.match(validateLevels({ side: 'short', entry: 100, sl: 104, tps: [101] }), /TP1 must be below the entry/);
  assert.deepEqual(rewardRisk({ side: 'long', entry: 100, sl: 95, tps: [107.5, 115] }), [1.5, 3]);
});

test('both take-profits: +1.5R (half at 1R, half at 2R)', () => {
  const { signal, events } = advance(long(), [k(0, 100, 106, 99, 105), k(1, 105, 111, 104, 110)]);
  assert.equal(signal.outcome, 'tp2');
  assert.equal(signal.resultR, 1.5);
  assert.deepEqual(events.map((e) => e.type), ['tp', 'breakeven', 'tp', 'closed']);
});

test('TP1 then back to break-even: +0.5R', () => {
  const { signal } = advance(long(), [k(0, 100, 106, 99, 105), k(1, 105, 105, 99.5, 100)]);
  assert.equal(signal.outcome, 'tp1');
  assert.equal(signal.resultR, 0.5);
});

test('stop-loss: -1R, and a candle touching both counts as the stop', () => {
  assert.equal(advance(long(), [k(0, 100, 101, 94, 96)]).signal.resultR, -1);
  const both = advance(long(), [k(0, 100, 106, 94, 100)]).signal;
  assert.equal(both.outcome, 'sl');
  assert.equal(both.resultR, -1);
});

test('fees come off the result', () => {
  // 0.05% per side on a 100 entry with a 5-point stop = 0.02R
  const { signal } = advance(long({ feePct: 0.0005 }), [k(0, 100, 101, 94, 96)]);
  assert.equal(signal.resultR, -1.02);
});

test('limit entry fills on touch, expires if never reached', () => {
  const s = { ...initialState({ side: 'short', entry: 100, sl: 104, tps: [96], entryType: 'limit' }), feePct: 0, expiresAt: new Date(T0 + 3 * 60_000) };
  let r = advance(s, [k(0, 98, 99, 97, 98)]);
  assert.equal(r.signal.status, 'pending');
  r = advance(s, [k(1, 98, 100.5, 98, 100), k(2, 100, 100, 95.5, 96)]);
  assert.equal(r.signal.status, 'closed'); assert.equal(r.signal.resultR, 1);
  const never = { ...initialState({ side: 'long', entry: 90, sl: 85, tps: [100], entryType: 'limit' }), expiresAt: new Date(T0 + 60_000) };
  assert.equal(advance(never, [k(0, 98, 99, 97, 98), k(1, 98, 99, 97, 98)]).signal.status, 'expired');
});

test('processing the same candle twice changes nothing', () => {
  const s = long();
  advance(s, [k(0, 100, 106, 99, 105)]);
  advance(s, [k(0, 100, 106, 99, 105)]);
  assert.equal(s.realizedR, 0.5);
});

test('time limit and staff close at market', () => {
  const s = long({ maxHoldUntil: new Date(T0 + 2 * 60_000) });
  const r = advance(s, [k(0, 100, 102, 99, 101), k(1, 101, 103, 100, 102)]);
  assert.equal(r.signal.outcome, 'time'); assert.equal(r.signal.resultR, 0.4);
  const m = closeAtMarket(long(), 97.5);
  assert.equal(m.signal.outcome, 'manual'); assert.equal(m.signal.resultR, -0.5);
});
