/** The outcome a market actually produced, from the settling score. null when it can't be told. */
export function marketOutcome(market, score) {
  if (!score || score.home == null || score.away == null) return null;
  if (market.key === 'total') return score.home + score.away > market.line ? 'over' : 'under';
  if (market.key === 'btts') return score.home > 0 && score.away > 0 ? 'yes' : 'no';
  return null;
}

// Valid outcomes per booking-code market.
export const MARKET_OUTCOMES = Object.freeze({
  '1x2': ['home', 'draw', 'away'],
  winner: ['home', 'away'],
  dc: ['1X', 'X2', '12'],
  total: ['over', 'under'],
  btts: ['yes', 'no'],
});

const DOUBLE_CHANCE = { '1X': ['home', 'draw'], X2: ['draw', 'away'], 12: ['home', 'away'] };

/**
 * Settle one booking-code selection from its linked tip's result ({state, score, winner}).
 * Returns 'won' | 'lost' | 'void', or null while undecided (or when staff must decide).
 */
export function evaluateSelection(sel, tipResult) {
  if (!tipResult || tipResult.state === 'pending') return null;
  const { score, winner } = tipResult;
  if (score == null && !winner) return tipResult.state === 'void' ? 'void' : null;
  switch (sel.market) {
    case '1x2':
      return winner ? (winner === sel.outcome ? 'won' : 'lost') : null;
    case 'winner':
      if (!winner) return null;
      if (winner === 'draw') return 'void';
      return winner === sel.outcome ? 'won' : 'lost';
    case 'dc':
      return winner ? (DOUBLE_CHANCE[sel.outcome]?.includes(winner) ? 'won' : 'lost') : null;
    case 'total':
    case 'btts': {
      const actual = marketOutcome({ key: sel.market, line: sel.line }, score);
      return actual ? (actual === sel.outcome ? 'won' : 'lost') : null;
    }
    default:
      return null;
  }
}

/** Accumulator rule: one lost selection loses the code; void selections drop out. */
export function combineSelections(results) {
  if (!results.length) return 'pending';
  if (results.includes('lost')) return 'lost';
  if (results.includes('pending')) return 'pending';
  return results.every((r) => r === 'void') ? 'void' : 'won';
}
