import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight, ArrowUpRight, CandlestickChart, Crown, Lock, Radio, Trophy,
} from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { signalsApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDate, formatDateTime, formatPct, formatPrice, formatProb } from '../../utils/format';

const TYPES = [{ value: '', label: 'All' }, { value: 'market', label: 'Markets' }, { value: 'sports', label: 'Sports' }];

function MarketCard({ s, locked }) {
  const up = s.summary.direction === 'up';
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><CandlestickChart className="size-5" /></div>
          <div>
            <p className="font-mono text-lg font-bold">{s.title}</p>
            <p className="text-xs text-base-content/50">{s.subtitle}{s.summary.lastClose !== undefined && ` · last ${formatPrice(s.summary.lastClose, s.summary.currency)}`}</p>
          </div>
        </div>
        {!locked && (
          <span className={`flex items-center gap-0.5 text-sm font-semibold ${up ? 'text-success' : 'text-error'}`}>
            {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}{formatPct(s.summary.changePct)}
          </span>
        )}
      </div>
      {locked ? <LockedRow /> : (
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-base-content/50">Model target</p>
            <p className="font-display text-2xl font-bold">{formatPrice(s.summary.targetPrice, s.summary.currency, s.summary.lastClose)}</p>
          </div>
          <p className="text-xs text-base-content/50">Hit rate {formatProb(s.summary.directionalAccuracy)}</p>
        </div>
      )}
    </>
  );
}

function SportsCard({ s, locked }) {
  const pick = { home: `${s.summary.home} win`, draw: 'Draw', away: `${s.summary.away} win` }[s.summary.pick?.outcome];
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary"><Trophy className="size-5" /></div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{s.title}</p>
          <p className="truncate text-xs text-base-content/50">{s.subtitle} · {formatDateTime(s.summary.kickoff)}</p>
        </div>
      </div>
      {locked ? <LockedRow /> : (
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-base-content/50">Model pick</p>
            <p className="truncate font-display text-xl font-bold">{pick}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold">{formatProb(s.summary.pick?.probability)}</p>
            <p className="text-xs capitalize text-base-content/50">{s.summary.confidence} confidence</p>
          </div>
        </div>
      )}
    </>
  );
}

function LockedRow() {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-field border border-dashed border-base-content/20 bg-base-100/40 px-3 py-3 text-sm text-base-content/60">
      <Lock className="size-4" /> Outlook available on Pro and Elite
    </div>
  );
}

export default function Signals() {
  useDocumentTitle('Signals');
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || '';
  const type = params.get('type') || '';
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    signalsApi.list({ ...(date && { date }), ...(type && { type }) })
      .then((data) => setState({ status: 'ready', data }))
      .catch((err) => setState({ status: 'error', message: errorMessage(err) }));
  }, [date, type]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const data = state.data;
  const top = data?.entitled ? data.items.slice().sort((a, b) => b.strength - a.strength)[0] : null;

  return (
    <>
      <PageHeader
        title="Signals"
        subtitle="Model outputs published on a schedule: markets after the US close (crypto daily), football each morning (UTC)."
        actions={data?.dates?.length > 0 && (
          <select className="select select-sm" value={data.date || ''} onChange={(e) => set({ date: e.target.value })} aria-label="Run date">
            {data.dates.map((d) => <option key={d} value={d}>{formatDate(d)}</option>)}
          </select>
        )}
      />

      {data && !data.entitled && (
        <div className="glass-card mb-6 flex flex-col gap-4 border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/10 p-5 sm:flex-row sm:items-center">
          <Crown className="size-8 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">Unlock the full signals feed</p>
            <p className="text-sm text-base-content/70">See every target price, match pick and probability, plus full charts. Signals don&apos;t count toward your daily predictions.</p>
          </div>
          <Link to="/app/billing?plan=pro" className="btn btn-primary btn-sm">Upgrade</Link>
        </div>
      )}

      <div role="tablist" className="tabs tabs-box mb-6 w-fit">
        {TYPES.map((t) => (
          <button key={t.value} type="button" role="tab" className={`tab ${type === t.value ? 'tab-active' : ''}`} onClick={() => set({ type: t.value })} aria-selected={type === t.value}>{t.label}</button>
        ))}
      </div>

      {state.status === 'error' && <div role="alert" className="alert alert-error alert-soft">{state.message}</div>}
      {state.status === 'loading' && !data && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 rounded-box" />)}</div>}
      {data && data.items.length === 0 && (
        <EmptyState icon={Radio} title="No signals yet">The first scheduled run will publish signals here.</EmptyState>
      )}
      {data && data.items.length > 0 && (
        <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${state.status === 'loading' ? 'opacity-60' : ''}`}>
          {data.items.map((s) => {
            const locked = Boolean(s.locked);
            const body = (
              <div className={`glass-card relative h-full p-5 ${locked ? '' : 'glass-card-hover'} ${top?.id === s.id ? 'border-primary/50' : ''}`}>
                {top?.id === s.id && <span className="badge badge-primary badge-sm absolute -top-2 right-4">Strongest</span>}
                {s.type === 'market' ? <MarketCard s={s} locked={locked} /> : <SportsCard s={s} locked={locked} />}
              </div>
            );
            return locked ? <div key={s.id}>{body}</div> : <Link key={s.id} to={`/app/signals/${s.id}`}>{body}</Link>;
          })}
        </div>
      )}
    </>
  );
}
