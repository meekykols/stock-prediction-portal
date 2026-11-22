import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, CircleCheck, CircleX, Clock, Crown, Lock, Medal, Send, Sparkles, Trophy } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import PromoBanner from '../../components/contest/PromoBanner';
import { contestApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDate, formatProb, formatTime } from '../../utils/format';
import { SPORTS } from '../../utils/sports';

const CODES = { home: '1', draw: 'X', away: '2' };
const OUTCOMES = { '1x2': ['home', 'draw', 'away'], winner: ['home', 'away'] };
const REWARD = { cash: 'Cash prize', elite: 'Free Elite month', advert: 'Advert spot' };
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

function ResultIcon({ result }) {
  if (result === 'won') return <CircleCheck className="size-4 text-success" aria-label="Correct" />;
  if (result === 'lost') return <CircleX className="size-4 text-error" aria-label="Wrong" />;
  if (result === 'void') return <Ban className="size-4 text-base-content/40" aria-label="Void" />;
  return <Clock className="size-4 text-base-content/30" aria-label="Pending" />;
}

function pickText(p) {
  if (p.outcome === 'draw') return 'Draw';
  const [home, away] = String(p.label).split(' v ');
  return `${p.outcome === 'home' ? home : away} win`;
}

function SlipCard({ slip, multiplier }) {
  return (
    <div className="glass-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Your slip for {formatDate(slip.date)}</h3>
          <p className="text-sm text-base-content/60">
            {slip.status === 'settled'
              ? slip.perfect ? `Perfect slip! ${slip.correct} correct × ${multiplier}` : `${slip.correct} correct, ${slip.wrong} wrong${slip.voided ? `, ${slip.voided} void` : ''}`
              : `${slip.correct} correct, ${slip.wrong} wrong so far · settles after the last match`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold text-primary">{slip.status === 'settled' ? slip.points : '…'}</p>
          <p className="text-xs text-base-content/50">points</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-base-content/5">
        {slip.picks.map((p) => (
          <li key={String(p.tip)} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.label}</p>
              <p className="truncate text-xs text-base-content/50">{SPORTS[p.sport]?.label} · {p.league} · {formatTime(p.kickoff)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="badge badge-sm badge-primary badge-soft">{pickText(p)}</span>
              <ResultIcon result={p.result} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Builder({ state, onSubmitted }) {
  const { options, today, showModel } = state;
  const [picks, setPicks] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const count = Object.keys(picks).length;
  const groups = useMemo(() => {
    const m = new Map();
    for (const o of options) {
      const k = `${o.sport}|${o.league?.name}`;
      if (!m.has(k)) m.set(k, { sport: o.sport, league: o.league, items: [] });
      m.get(k).items.push(o);
    }
    return [...m.values()];
  }, [options]);

  const toggle = (id, outcome) => setPicks((p) => {
    const next = { ...p };
    if (next[id] === outcome) delete next[id];
    else if (next[id] || count < today.max) next[id] = outcome;
    else toast(`Your slip can have at most ${today.max} picks`);
    return next;
  });

  const submit = async () => {
    setSending(true);
    try {
      const res = await contestApi.submit(Object.entries(picks).map(([tipId, outcome]) => ({ tipId, outcome })));
      toast.success(res.message);
      onSubmitted();
    } catch (e) {
      toast.error(errorMessage(e));
      setConfirming(false);
    } finally { setSending(false); }
  };

  const ready = count >= today.required && count <= today.max;
  return (
    <div>
      <div className="space-y-4">
        {groups.map((g) => (
          <section key={`${g.sport}-${g.league?.name}`} className="glass-card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-base-content/10 px-4 py-2.5 text-sm">
              {(() => { const Icon = SPORTS[g.sport]?.icon; return Icon ? <Icon className="size-4 text-base-content/60" /> : null; })()}
              <span className="font-semibold">{g.league?.name}</span>
              <span className="text-xs text-base-content/50">{SPORTS[g.sport]?.label}</span>
            </header>
            <ul className="divide-y divide-base-content/5">
              {g.items.map((o) => (
                <li key={o.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-12 shrink-0 font-mono text-sm text-base-content/60">{formatTime(o.kickoff)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.home.name} v {o.away.name}</p>
                      {showModel && o.model?.outcome && (
                        <p className="text-xs text-base-content/50">Our model: {CODES[o.model.outcome]} ({formatProb(o.model.probability)})</p>
                      )}
                    </div>
                  </div>
                  <div className="join shrink-0 self-end sm:self-auto" role="group" aria-label={`Pick for ${o.home.name} v ${o.away.name}`}>
                    {OUTCOMES[o.market].map((out) => (
                      <button key={out} type="button" onClick={() => toggle(o.id, out)} aria-pressed={picks[o.id] === out}
                        title={out === 'draw' ? 'Draw' : `${out === 'home' ? o.home.name : o.away.name} win`}
                        className={`btn btn-sm join-item w-12 font-mono ${picks[o.id] === out ? 'btn-primary' : 'btn-ghost border-base-content/15'}`}>
                        {CODES[out]}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="sticky bottom-4 z-10 mt-6">
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 border border-primary/30 p-4 shadow-lg">
          <div>
            <p className="font-semibold">{count} of {today.required}–{today.max} picks</p>
            <progress className="progress progress-primary w-48" value={Math.min(count, today.required)} max={today.required} />
          </div>
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Final: you can&apos;t change it after this.</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={sending}>Back</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={sending}>{sending ? <span className="loading loading-spinner loading-xs" /> : <Send className="size-4" />}Enter slip</button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => setConfirming(true)}>
              <Send className="size-4" />{count < today.required ? `Pick ${today.required - count} more` : 'Review & enter'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ board }) {
  if (!board.rows.length) return <p className="p-5 text-sm text-base-content/60">No settled slips yet this month. Points appear once matches finish.</p>;
  return (
    <table className="table table-sm">
      <thead><tr><th className="w-12">#</th><th>Player</th><th className="text-right">Points</th><th className="hidden text-right sm:table-cell">Correct</th><th className="hidden text-right sm:table-cell">Perfect slips</th></tr></thead>
      <tbody>
        {board.rows.map((r) => (
          <tr key={r.rank} className={r.isMe ? 'bg-primary/10' : ''}>
            <td className="font-mono">{r.rank === 1 ? <Crown className="size-4 text-warning" aria-label="1st" /> : r.rank}</td>
            <td className="font-medium">{r.name}{r.isMe && <span className="badge badge-xs badge-primary ml-2">You</span>}</td>
            <td className="text-right font-mono font-semibold">{r.points}</td>
            <td className="hidden text-right font-mono sm:table-cell">{r.correct}</td>
            <td className="hidden text-right font-mono sm:table-cell">{r.perfectSlips}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Contest() {
  useDocumentTitle('Picks contest');
  const [state, setState] = useState(null);
  const [board, setBoard] = useState(null);
  const [slips, setSlips] = useState(null);
  const [winners, setWinners] = useState([]);

  const load = useCallback(() => {
    contestApi.state().then(setState).catch((e) => toast.error(errorMessage(e)));
    contestApi.leaderboard().then(setBoard).catch(() => {});
    contestApi.slips({ limit: 7 }).then(setSlips).catch(() => {});
  }, []);
  useEffect(() => { load(); contestApi.winners().then(setWinners).catch(() => {}); }, [load]);

  if (!state) return <div className="space-y-4"><div className="skeleton h-24 rounded-box" /><div className="skeleton h-96 rounded-box" /></div>;
  const { rules, eligibility, today, slip } = state;
  const me = board?.me ?? state.leaderboard.me;
  const month = board?.month ?? state.leaderboard.month;
  const pastSlips = (slips?.items || []).filter((s) => s.date !== today.date);

  return (
    <>
      <PageHeader
        title="Picks contest"
        subtitle={`${monthLabel(month)} · ${state.leaderboard.entrants} player${state.leaderboard.entrants === 1 ? '' : 's'} on the board`}
        actions={me && (
          <div className="flex gap-3">
            <div className="glass-card px-4 py-2 text-center"><p className="font-display text-2xl font-bold">#{me.rank}</p><p className="text-xs text-base-content/50">your rank</p></div>
            <div className="glass-card px-4 py-2 text-center"><p className="font-display text-2xl font-bold text-primary">{me.points}</p><p className="text-xs text-base-content/50">points</p></div>
          </div>
        )}
      />

      <div className="glass-card mb-6 grid gap-3 p-5 text-sm sm:grid-cols-3">
        <p><span className="font-semibold">Pick {rules.minPicks}–{rules.maxPicks} matches</span> from today&apos;s list. One slip a day; it&apos;s final once entered and only covers today&apos;s matches.</p>
        <p><span className="font-semibold">1 point per correct pick.</span> No wrong picks? Your points are multiplied by {rules.perfectMultiplier}. Postponed matches don&apos;t count.</p>
        <p><span className="font-semibold">Top of the month wins</span>: a cash prize, a free Elite month or an advert spot on the site, chosen by the team.</p>
        {rules.note && <p className="text-base-content/60 sm:col-span-3">{rules.note}</p>}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Today</h2>
          {slip ? (
            <SlipCard slip={slip} multiplier={rules.perfectMultiplier} />
          ) : !eligibility.canEnter ? (
            <div className="alert alert-info alert-soft"><Lock className="size-5" /><span>{eligibility.reason}</span>
              {eligibility.paid === false && <Link to="/app/billing" className="btn btn-sm btn-primary"><Sparkles className="size-4" />Upgrade</Link>}
            </div>
          ) : today.matches === 0 ? (
            <EmptyState icon={Trophy} title="No matches on today's list yet">Today&apos;s list is published at 05:00 UTC. Check back soon.</EmptyState>
          ) : today.closed ? (
            <EmptyState icon={Clock} title="Today's entries have closed">
              Slips need {today.required} picks and only {today.available} match{today.available === 1 ? ' is' : 'es are'} left to start. Enter early tomorrow to get the full list.
            </EmptyState>
          ) : (
            <>
              {today.required < rules.minPicks && (
                <p className="mb-3 text-sm text-base-content/60">Quiet day: only {today.matches} matches on the list, so {today.required} picks are enough today.</p>
              )}
              <Builder state={state} onSubmitted={load} />
            </>
          )}

          {pastSlips.length > 0 && (
            <>
              <h2 className="mb-3 mt-10 text-lg font-semibold">Your recent slips</h2>
              <div className="glass-card overflow-x-auto">
                <table className="table table-sm">
                  <thead><tr><th>Date</th><th className="text-right">Picks</th><th className="text-right">Correct</th><th className="text-right">Points</th><th /></tr></thead>
                  <tbody>{pastSlips.map((s) => (
                    <tr key={s.id}><td>{formatDate(s.date)}</td><td className="text-right font-mono">{s.picks.length}</td><td className="text-right font-mono">{s.correct}/{s.picks.length - s.voided}</td>
                      <td className="text-right font-mono font-semibold">{s.status === 'settled' ? s.points : '…'}</td><td>{s.perfect && <span className="badge badge-sm badge-success badge-soft">Perfect</span>}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <section className="glass-card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-base-content/10 px-4 py-3"><Medal className="size-4 text-primary" /><h2 className="font-semibold">Leaderboard · {monthLabel(month)}</h2></header>
            <div className="overflow-x-auto">{board ? <Leaderboard board={board} /> : <div className="skeleton m-4 h-40" />}</div>
            {me && me.rank > (board?.rows.length ?? 0) && <p className="border-t border-base-content/10 px-4 py-2 text-sm">You: #{me.rank} with {me.points} points</p>}
          </section>

          {winners.length > 0 && (
            <section className="glass-card p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><Trophy className="size-4 text-warning" />Past winners</h2>
              <ul className="space-y-2 text-sm">
                {winners.slice(0, 8).map((w, i) => (
                  <li key={`${w.month}-${w.name}-${i}`} className="flex items-center justify-between gap-3">
                    <span><span className="font-medium">{w.name}</span> <span className="text-base-content/50">· {monthLabel(w.month)}</span></span>
                    <span className="badge badge-sm badge-ghost">{REWARD[w.type]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <PromoBanner compact />
        </div>
      </div>
      <p className="mt-8 text-xs text-base-content/50">18+ only. {rules.freeUsersCanEnter ? 'Free to enter: no stake or purchase is needed to win.' : 'Open to customers on paid plans.'} The team may disqualify entries that break the rules.</p>
    </>
  );
}
