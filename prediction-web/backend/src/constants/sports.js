// Sports covered by the tips engine. Keys match the ML service.
export const SPORTS = Object.freeze(['football', 'basketball', 'american-football', 'volleyball', 'mma']);

export const SPORT_LABELS = Object.freeze({
  football: 'Football',
  basketball: 'Basketball',
  'american-football': 'American football',
  volleyball: 'Volleyball',
  mma: 'MMA',
});

// Roughly how long after the start a result can be expected, before we ask for it.
export const RESULT_AFTER_MS = Object.freeze({
  football: 2.25 * 3600e3,
  basketball: 2.75 * 3600e3,
  'american-football': 3.75 * 3600e3,
  volleyball: 2.5 * 3600e3,
  mma: 6 * 3600e3, // fights on a card share one start time
});

// Leagues tipped by default (API-Sports ids). Staff change these in the console.
export const DEFAULT_LEAGUES = Object.freeze({
  football: [39, 140, 135, 78, 61, 2, 3, 848, 88, 94, 40, 399],
  basketball: [12, 120],
  'american-football': [1, 2],
  volleyball: [97, 113],
  mma: [],
});
