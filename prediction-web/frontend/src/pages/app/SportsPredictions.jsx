import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarX2, PlugZap, Sparkles, Trophy } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import UsageMeter from '../../components/predictions/UsageMeter';
import TeamBadge from '../../components/predictions/TeamBadge';
import { predictionsApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { usePredictionUsage } from '../../hooks/usePredictionUsage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatTime } from '../../utils/format';
import { toastPredictionError } from '../../utils/predictionErrors';

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const FINISHED = new Set(['FT', 'AET', 'PEN']);

// Fixture dates are UTC days, matching the data provider.
function nextDays(n) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < n; i += 1) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + i));
    out.push({
      value: d.toISOString().slice(0, 10),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(d),
    });
  }
  return out;
}

function StatusCell({ f }) {
  const s = f.status?.short;
  if (FINISHED.has(s)) return <span className="font-mono font-semibold">{f.goals.home}–{f.goals.away}</span>;
  if (LIVE.has(s)) return <span className="badge badge-error badge-sm gap-1"><span className="size-1.5 animate-pulse rounded-full bg-current" />{f.status.elapsed}&apos;</span>;
  if (['PST', 'CANC', 'ABD'].includes(s)) return <span className="badge badge-ghost badge-sm">{f.status.long}</span>;
  return <span className="font-mono text-sm text-base-content/70">{formatTime(f.kickoff)}</span>;
}

export default function SportsPredictions() {
  useDocumentTitle('Sports predictions');
  const navigate = useNavigate();
  const { usage } = usePredictionUsage();
  const days = useMemo(() => nextDays(7), []);
  const [day, setDay] = useState(days[0].value);
  const [state, setState] = useState({ status: 'loading', fixtures: [], error: null });
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', fixtures: [], error: null });
    predictionsApi
      .fixtures(day)
      .then((d) => !cancelled && setState({ status: 'ready', fixtures: d.fixtures, error: null }))
      .catch((err) => !cancelled && setState({ status: 'error', fixtures: [], error: { message: errorMessage(err), code: err?.response?.data?.code } }));
    return () => { cancelled = true; };
  }, [day]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const f of state.fixtures) {
      const key = f.league.id;
      if (!map.has(key)) map.set(key, { league: f.league, fixtures: [] });
      map.get(key).fixtures.push(f);
    }
    return [...map.values()];
  }, [state.fixtures]);

  const analyse = async (f) => {
    setBusyId(f.id);
    try {
      const { prediction, reused } = await predictionsApi.createSports({ fixtureId: f.id });
      if (reused) toast('Showing your earlier analysis of this match. No prediction used.', { icon: '♻️' });
      navigate(`/app/predictions/${prediction.id}`);
    } catch (err) {
      toastPredictionError(err);
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Sports predictions"
        subtitle="Pick a fixture to get win, draw and goals probabilities."
        actions={<UsageMeter usage={usage?.sports} label="Today's sports predictions" />}
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button key={d.value} type="button" onClick={() => setDay(d.value)} className={`btn btn-sm shrink-0 rounded-full ${day === d.value ? 'btn-primary' : 'btn-ghost border-base-content/10'}`}>{d.label}</button>
        ))}
      </div>

      {state.status === 'loading' ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-36 rounded-box" />)}</div>
      ) : state.status === 'error' ? (
        state.error.code === 'not_configured' ? (
          <EmptyState icon={PlugZap} title="Sports data isn't connected yet">Fixtures will appear here as soon as the sports data feed is switched on.</EmptyState>
        ) : (
          <div role="alert" className="alert alert-warning alert-soft">{state.error.message}</div>
        )
      ) : grouped.length === 0 ? (
        <EmptyState icon={CalendarX2} title="No fixtures in tracked leagues">Try another day.</EmptyState>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ league, fixtures }) => (
            <section key={league.id} className="glass-card overflow-hidden">
              <header className="flex items-center gap-3 border-b border-base-content/10 px-5 py-3">
                {league.logo ? <img src={league.logo} alt="" className="size-6 object-contain" /> : <Trophy className="size-5 text-primary" />}
                <div>
                  <p className="font-semibold">{league.name}</p>
                  <p className="text-xs text-base-content/50">{league.country}</p>
                </div>
              </header>
              <ul className="divide-y divide-base-content/10">
                {fixtures.map((f) => (
                  <li key={f.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[4rem_1fr_auto_1fr_auto]">
                    <StatusCell f={f} />
                    <TeamBadge team={f.home} />
                    <span className="hidden text-xs text-base-content/40 sm:block">vs</span>
                    <div className="col-start-2 sm:col-start-auto"><TeamBadge team={f.away} /></div>
                    <button type="button" className="btn btn-sm btn-primary btn-soft col-start-3 row-span-2 row-start-1 sm:row-span-1 sm:col-start-auto" onClick={() => analyse(f)} disabled={busyId !== null}>
                      {busyId === f.id ? <span className="loading loading-spinner loading-xs" /> : <Sparkles className="size-4" />}
                      <span className="hidden sm:inline">Analyse</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
