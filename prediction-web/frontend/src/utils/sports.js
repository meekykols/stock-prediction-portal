import { CircleDot, Goal, HandFist, Shield, Volleyball } from 'lucide-react';

export const SPORTS = {
  football: { label: 'Football', icon: Goal },
  basketball: { label: 'Basketball', icon: CircleDot },
  'american-football': { label: 'American football', icon: Shield },
  volleyball: { label: 'Volleyball', icon: Volleyball },
  mma: { label: 'MMA', icon: HandFist },
};

/** Tips are filed by UTC date, so the day tabs are UTC days too. */
export const utcDay = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

export const pickCode = (outcome) => ({ home: '1', draw: 'X', away: '2' })[outcome];

export function pickLabel(tip) {
  const { outcome } = tip.prediction.pick;
  return outcome === 'draw' ? 'Draw' : `${tip[outcome]?.name} to win`;
}

export function marketLabel(m) {
  if (m.key === 'total') return `${m.outcome === 'over' ? 'Over' : 'Under'} ${m.line} ${m.unit}`;
  if (m.key === 'btts') return `Both teams to score: ${m.outcome === 'yes' ? 'Yes' : 'No'}`;
  return m.key;
}

/** "Arsenal win", "Home or draw", "Over 2.5" for a booking-code selection. */
export function selectionPick(s) {
  const [home = 'Home', away = 'Away'] = String(s.label || '').split(' v ').length === 2 ? s.label.split(' v ') : [];
  switch (s.market) {
    case '1x2':
    case 'winner':
      return s.outcome === 'draw' ? 'Draw' : `${s.outcome === 'home' ? home : away} win`;
    case 'dc':
      return { '1X': `${home} or draw`, X2: `${away} or draw`, 12: 'Either team wins' }[s.outcome] ?? s.outcome;
    case 'total':
      return `${s.outcome === 'over' ? 'Over' : 'Under'} ${s.line}`;
    case 'btts':
      return `Both score: ${s.outcome === 'yes' ? 'Yes' : 'No'}`;
    default:
      return s.outcome;
  }
}
