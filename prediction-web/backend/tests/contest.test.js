import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareStandings, displayName, previousMonth, requiredPicks, scoreSlip,
} from '../src/utils/contestScoring.js';

test('minimum picks drops to the number of matches on quiet days', () => {
  assert.equal(requiredPicks(10, 34), 10);
  assert.equal(requiredPicks(10, 6), 6);
  assert.equal(requiredPicks(10, 0), 1);
});

test('one point per correct pick; a perfect slip doubles', () => {
  assert.deepEqual(scoreSlip(['won', 'won', 'lost', 'won']), { status: 'settled', correct: 3, wrong: 1, voided: 0, perfect: false, points: 3 });
  assert.equal(scoreSlip(Array(10).fill('won')).points, 20);
  assert.equal(scoreSlip(Array(10).fill('won'), 3).points, 30);
});

test('void picks neither score nor spoil a perfect slip', () => {
  const s = scoreSlip(['won', 'void', 'won']);
  assert.equal(s.perfect, true);
  assert.equal(s.points, 4);
  assert.equal(scoreSlip(['void', 'void']).perfect, false);
  assert.equal(scoreSlip(['void', 'void']).points, 0);
});

test('slips stay pending until every pick is decided', () => {
  const s = scoreSlip(['won', 'pending']);
  assert.equal(s.status, 'pending');
  assert.equal(s.points, 0);
  assert.equal(s.correct, 1);
});

test('leaderboard tie-breaks: points, perfect slips, correct picks, earliest', () => {
  const rows = [
    { id: 'late', points: 20, perfectSlips: 1, correct: 12, lastScoredAt: '2026-11-20T20:00:00Z' },
    { id: 'early', points: 20, perfectSlips: 1, correct: 12, lastScoredAt: '2026-11-18T20:00:00Z' },
    { id: 'moreCorrect', points: 20, perfectSlips: 1, correct: 14, lastScoredAt: '2026-11-29T20:00:00Z' },
    { id: 'perfect', points: 20, perfectSlips: 2, correct: 10, lastScoredAt: '2026-11-29T20:00:00Z' },
    { id: 'top', points: 31, perfectSlips: 0, correct: 31, lastScoredAt: '2026-11-29T20:00:00Z' },
  ];
  assert.deepEqual(rows.sort(compareStandings).map((r) => r.id), ['top', 'perfect', 'moreCorrect', 'early', 'late']);
});

test('display names hide surnames', () => {
  assert.equal(displayName({ firstName: 'Ada', lastName: 'Obi' }), 'Ada O.');
  assert.equal(previousMonth('2026-01'), '2025-12');
});
