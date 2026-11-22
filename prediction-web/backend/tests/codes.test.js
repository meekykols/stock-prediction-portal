import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combineSelections, evaluateSelection } from '../src/utils/sportsMarkets.js';

const done = (home, away, winner) => ({ state: 'won', score: { home, away }, winner });

test('1X2, double chance and winner selections', () => {
  assert.equal(evaluateSelection({ market: '1x2', outcome: 'draw' }, done(1, 1, 'draw')), 'won');
  assert.equal(evaluateSelection({ market: 'dc', outcome: '1X' }, done(1, 1, 'draw')), 'won');
  assert.equal(evaluateSelection({ market: 'dc', outcome: '12' }, done(1, 1, 'draw')), 'lost');
  assert.equal(evaluateSelection({ market: 'winner', outcome: 'home' }, done(20, 20, 'draw')), 'void');
  assert.equal(evaluateSelection({ market: 'winner', outcome: 'away' }, { state: 'lost', score: null, winner: 'away' }), 'won'); // MMA
});

test('totals and both teams to score use the final score', () => {
  assert.equal(evaluateSelection({ market: 'total', outcome: 'over', line: 2.5 }, done(2, 1, 'home')), 'won');
  assert.equal(evaluateSelection({ market: 'total', outcome: 'over', line: 3.5 }, done(2, 1, 'home')), 'lost');
  assert.equal(evaluateSelection({ market: 'btts', outcome: 'no' }, done(2, 0, 'home')), 'won');
});

test('undecided, postponed and manually-corrected tips', () => {
  assert.equal(evaluateSelection({ market: '1x2', outcome: 'home' }, { state: 'pending' }), null);
  assert.equal(evaluateSelection({ market: '1x2', outcome: 'home' }, { state: 'void', note: 'Postponed' }), 'void');
  // A tip corrected by hand has no score to judge other markets by: staff decide.
  assert.equal(evaluateSelection({ market: 'total', outcome: 'over', line: 2.5 }, { state: 'won' }), null);
});

test('accumulator rule', () => {
  assert.equal(combineSelections(['won', 'won']), 'won');
  assert.equal(combineSelections(['won', 'void']), 'won');
  assert.equal(combineSelections(['won', 'pending', 'lost']), 'lost');
  assert.equal(combineSelections(['won', 'pending']), 'pending');
  assert.equal(combineSelections(['void', 'void']), 'void');
  assert.equal(combineSelections([]), 'pending');
});
