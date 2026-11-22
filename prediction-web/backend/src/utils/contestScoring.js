import { evaluateSelection } from './sportsMarkets.js';

export const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);
export const monthOf = (date) => date.slice(0, 7);

/** On quiet days the minimum drops to however many matches are on the list that day. */
export const requiredPicks = (minPicks, dayTotal) => Math.max(1, Math.min(minPicks, dayTotal));

export const pickResult = (pick, tipResult) => evaluateSelection(pick, tipResult);

/**
 * 1 point per correct pick. A slip with no wrong picks (and at least one correct) is "perfect"
 * and its points are multiplied. Void picks (postponed, ties) neither score nor count as wrong.
 */
export function scoreSlip(results, multiplier = 2) {
  const count = (r) => results.filter((x) => x === r).length;
  const correct = count('won');
  const wrong = count('lost');
  const voided = count('void');
  const pending = count('pending');
  const perfect = pending === 0 && wrong === 0 && correct > 0;
  return {
    status: pending ? 'pending' : 'settled',
    correct,
    wrong,
    voided,
    perfect,
    points: pending ? 0 : correct * (perfect ? multiplier : 1),
  };
}

/** Leaderboard order: points, then perfect slips, then correct picks, then whoever got there first. */
export function compareStandings(a, b) {
  return (b.points - a.points)
    || (b.perfectSlips - a.perfectSlips)
    || (b.correct - a.correct)
    || (new Date(a.lastScoredAt || 8.64e15) - new Date(b.lastScoredAt || 8.64e15));
}

export const displayName = (u) => (u ? `${u.firstName ?? ''} ${(u.lastName ?? '').charAt(0)}${u.lastName ? '.' : ''}`.trim() : 'Former member');

export function previousMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
