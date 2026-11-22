import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTip } from '../src/services/tips.service.js';

const tip = (pick, markets = []) => ({ prediction: { pick, markets } });
const finished = (home, away, winner) => ({ status: { state: 'finished', long: 'Match Finished' }, score: { home, away }, winner });

test('1X2 tips settle on the winner, markets on the score', () => {
  const t = tip({ market: '1x2', outcome: 'home' }, [
    { key: 'total', line: 2.5, outcome: 'over' },
    { key: 'btts', outcome: 'yes' },
  ]);
  const r = evaluateTip(t, finished(2, 0, 'home'));
  assert.equal(r.state, 'won');
  assert.deepEqual(r.markets.map((m) => m.won), [false, false]);
  assert.equal(evaluateTip(t, finished(1, 1, 'draw')).state, 'lost');
});

test('a draw pick wins on a draw', () => {
  assert.equal(evaluateTip(tip({ market: '1x2', outcome: 'draw' }), finished(0, 0, 'draw')).state, 'won');
});

test('a tie voids a two-way winner tip', () => {
  const r = evaluateTip(tip({ market: 'winner', outcome: 'away' }), finished(20, 20, 'draw'));
  assert.equal(r.state, 'void');
});

test('volleyball sets line: 3-1 is over 3.5 sets', () => {
  const r = evaluateTip(tip({ market: 'winner', outcome: 'home' }, [{ key: 'total', line: 3.5, outcome: 'under' }]), finished(3, 1, 'home'));
  assert.equal(r.state, 'won');
  assert.equal(r.markets[0].won, false);
});

test('MMA has no score but still settles on the winner', () => {
  const r = evaluateTip(tip({ market: 'winner', outcome: 'home' }), { status: { state: 'finished' }, score: null, winner: 'away' });
  assert.equal(r.state, 'lost');
});

test('postponed events void; live or scheduled events wait', () => {
  assert.equal(evaluateTip(tip({ market: '1x2', outcome: 'home' }), { status: { state: 'void', long: 'Postponed' } }).state, 'void');
  assert.equal(evaluateTip(tip({ market: '1x2', outcome: 'home' }), { status: { state: 'live' } }), null);
  assert.equal(evaluateTip(tip({ market: '1x2', outcome: 'home' }), undefined), null);
});
