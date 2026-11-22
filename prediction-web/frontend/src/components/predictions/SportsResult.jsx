import { CalendarClock, Info, MapPin, Target } from 'lucide-react';
import TeamBadge from './TeamBadge';
import FormPills from './FormPills';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { formatDateTime, formatProb } from '../../utils/format';

const CONFIDENCE = { low: 'badge-warning', medium: 'badge-info', high: 'badge-success' };

function ProbabilityBar({ probabilities, home, away }) {
  const parts = [
    { key: 'home', label: home, value: probabilities.home, className: 'bg-primary text-primary-content' },
    { key: 'draw', label: 'Draw', value: probabilities.draw, className: 'bg-base-300 text-base-content' },
    { key: 'away', label: away, value: probabilities.away, className: 'bg-secondary text-secondary-content' },
  ];
  return (
    <div>
      <div className="flex h-12 overflow-hidden rounded-field">
        {parts.map((p) => (
          <div key={p.key} className={`grid place-items-center text-sm font-semibold transition-all ${p.className}`} style={{ width: `${Math.max(p.value * 100, 6)}%` }} title={`${p.label}: ${formatProb(p.value)}`}>
            {formatProb(p.value)}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 text-xs text-base-content/60">
        <span className="truncate">{home} win</span>
        <span className="text-center">Draw</span>
        <span className="truncate text-right">{away} win</span>
      </div>
    </div>
  );
}

export default function SportsResult({ result }) {
  const { legal } = useSiteConfig();
  const { fixture, prediction, inputs, model } = result;
  const pickLabel = { home: `${fixture.home.name} win`, draw: 'Draw', away: `${fixture.away.name} win` }[prediction.pick.outcome];
  const finished = result.settled && fixture.goals?.home !== null && fixture.goals?.home !== undefined;

  const markets = [
    { label: 'Over 2.5 goals', value: prediction.markets.over25 },
    { label: 'Under 2.5 goals', value: prediction.markets.under25 },
    { label: 'Both teams score', value: prediction.markets.bttsYes },
    { label: 'Not both score', value: prediction.markets.bttsNo },
  ];
  const maxScore = Math.max(...prediction.correctScores.map((s) => s.probability));

  return (
    <div className="space-y-6">
      <div className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="glow-orb -left-16 -top-16 size-56 bg-primary/20" />
        <div className="glow-orb -bottom-16 -right-16 size-56 bg-secondary/20" />
        <div className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-base-content/60">
          {fixture.league?.logo && <img src={fixture.league.logo} alt="" className="size-5 object-contain" />}
          <span>{fixture.league?.name}{fixture.league?.round ? ` · ${fixture.league.round}` : ''}</span>
          <span className="flex items-center gap-1"><CalendarClock className="size-3.5" />{formatDateTime(fixture.kickoff)}</span>
          {fixture.venue && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{fixture.venue}</span>}
        </div>
        <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamBadge team={fixture.home} size="lg" />
          <div className="text-center">
            {finished ? (
              <p className="font-display text-4xl font-bold">{fixture.goals.home} – {fixture.goals.away}</p>
            ) : (
              <p className="font-display text-2xl font-bold text-base-content/40">vs</p>
            )}
            <p className="mt-1 text-xs text-base-content/50">{fixture.status?.long}</p>
          </div>
          <TeamBadge team={fixture.away} size="lg" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-semibold">Match outcome</h3>
          <div className="mt-4"><ProbabilityBar probabilities={prediction.probabilities} home={fixture.home.name} away={fixture.away.name} /></div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {markets.map((m) => (
              <div key={m.label} className="rounded-field border border-base-content/10 bg-base-100/50 p-3">
                <p className="text-xs text-base-content/60">{m.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold">{formatProb(m.value)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Model pick</h3>
            <span className={`badge badge-soft ${CONFIDENCE[prediction.confidence]}`}>{prediction.confidence} confidence</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 to-secondary/25 text-primary"><Target className="size-6" /></div>
            <div>
              <p className="font-display text-xl font-bold">{pickLabel}</p>
              <p className="text-sm text-base-content/60">{formatProb(prediction.pick.probability)} probability</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-field bg-primary/10 p-3"><p className="text-xs text-base-content/60">xG {fixture.home.name}</p><p className="font-mono text-xl font-bold text-primary">{prediction.expectedGoals.home}</p></div>
            <div className="rounded-field bg-secondary/10 p-3"><p className="text-xs text-base-content/60">xG {fixture.away.name}</p><p className="font-mono text-xl font-bold text-secondary">{prediction.expectedGoals.away}</p></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="font-semibold">Most likely scores</h3>
          <ul className="mt-4 space-y-3">
            {prediction.correctScores.map((s) => (
              <li key={s.score} className="flex items-center gap-3">
                <span className="w-10 font-mono font-semibold">{s.score}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-base-300">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${(s.probability / maxScore) * 100}%` }} />
                </div>
                <span className="w-12 text-right font-mono text-sm text-base-content/70">{formatProb(s.probability)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card overflow-x-auto p-6">
          <h3 className="font-semibold">What the model used</h3>
          <table className="table table-sm mt-2">
            <thead><tr><th /><th className="text-right" title="Goals scored per game">GF/g</th><th className="text-right" title="Goals conceded per game">GA/g</th><th className="text-right" title="Games played">GP</th><th>Form</th></tr></thead>
            <tbody>
              {[['home', fixture.home.name], ['away', fixture.away.name]].map(([side, name]) => (
                <tr key={side}>
                  <td className="max-w-28 truncate font-medium">{name}<span className="block text-xs font-normal text-base-content/50">{inputs[side].basis === 'season' ? 'season' : side} record</span></td>
                  <td className="text-right font-mono">{inputs[side].scored.toFixed(2)}</td>
                  <td className="text-right font-mono">{inputs[side].conceded.toFixed(2)}</td>
                  <td className="text-right font-mono">{inputs[side].matches}</td>
                  <td><FormPills form={inputs[side].form} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card flex gap-4 p-5">
        <Info className="size-6 shrink-0 text-warning" />
        <p className="text-sm text-base-content/70">
          <span className="font-medium text-base-content">{model.name}:</span> {model.description} It does not account for injuries, line-ups or motivation. {legal.disclaimer}
        </p>
      </div>
    </div>
  );
}
