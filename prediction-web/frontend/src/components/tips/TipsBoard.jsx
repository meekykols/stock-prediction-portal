import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ban, CircleCheck, CircleX, Flame, Gem, Landmark, Lock, RefreshCw, Sparkles } from 'lucide-react';
import { tipsApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { formatProb, formatTime } from '../../utils/format';
import { SPORTS, marketLabel, pickCode, pickLabel, utcDay } from '../../utils/sports';
import EmptyState from '../ui/EmptyState';
import PromoBanner from '../contest/PromoBanner';

const DAYS = [
  { offset: -1, label: 'Yesterday' },
  { offset: 0, label: 'Today' },
  { offset: 1, label: 'Tomorrow' },
];

const CONFIDENCE = {
  high: 'badge-success',
  medium: 'badge-warning',
  low: 'badge-ghost',
};

function Team({ team, align }) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      {team?.logo ? <img src={team.logo} alt="" className="size-5 shrink-0 object-contain" loading="lazy" /> : <span className="size-5 shrink-0 rounded-full bg-base-300" />}
      <span className="truncate text-sm font-medium">{team?.name}</span>
    </span>
  );
}

function ResultBadge({ tip }) {
  const { state, note } = tip.result || {};
  if (state === 'won') return <span className="badge badge-success badge-soft gap-1"><CircleCheck className="size-3.5" />Won</span>;
  if (state === 'lost') return <span className="badge badge-error badge-soft gap-1"><CircleX className="size-3.5" />Lost</span>;
  if (state === 'void') return <span className="badge badge-ghost gap-1" title={note}><Ban className="size-3.5" />Void</span>;
  if (new Date(tip.kickoff) <= new Date()) return <span className="badge badge-info badge-soft">{tip.status?.state === 'live' ? 'Live' : 'Awaiting result'}</span>;
  return null;
}

function Kickoff({ tip }) {
  const score = tip.result?.score;
  if (score && score.home != null) {
    return <span className="font-mono text-sm font-semibold">{score.home}–{score.away}</span>;
  }
  return <span className="font-mono text-sm text-base-content/70">{formatTime(tip.kickoff)}</span>;
}

function LockedCell({ upgradeTo }) {
  return (
    <Link to={upgradeTo} className="group flex items-center gap-2 rounded-lg border border-dashed border-base-content/15 px-3 py-1.5 text-xs text-base-content/60 hover:border-primary hover:text-primary">
      <Lock className="size-3.5" />
      <span className="select-none blur-[3px]" aria-hidden>1 · 64%</span>
      <span className="font-medium">Unlock</span>
    </Link>
  );
}

const pct = (v) => `${Math.round(v * 100)}%`;
const OUTCOME_LABEL = (tip, o) => (o === 'draw' ? 'Draw' : `${tip[o]?.name}`);

/** Where the chance comes from, for the hover text. */
function sourceTitle(p) {
  const o = p.pick.outcome;
  const parts = [];
  if (p.model?.probabilities?.[o] != null) parts.push(`Our model ${pct(p.model.probabilities[o])}`);
  if (p.market?.probabilities?.[o] != null) parts.push(`Bookmakers ${pct(p.market.probabilities[o])} (${p.market.bookmakers} books)`);
  return parts.join(' · ');
}

function TipRow({ tip, upgradeTo }) {
  const p = tip.prediction;
  const ps = p?.predictedScore;
  return (
    <li className="grid grid-cols-[3.5rem_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[3.5rem_minmax(0,1fr)_4rem_minmax(10rem,13rem)_9rem_7rem]">
      <div className="row-span-2 flex flex-col items-start gap-1 md:row-span-1">
        <Kickoff tip={tip} />
        {tip.featured && <span className="badge badge-xs badge-primary gap-0.5"><Flame className="size-3" />Top</span>}
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <Team team={tip.home} />
        <Team team={tip.away} />
      </div>

      {tip.locked ? (
        <div className="col-start-2 md:col-span-3 md:col-start-auto"><LockedCell upgradeTo={upgradeTo} /></div>
      ) : (
        <>
          <div className="hidden text-center md:block" title="Predicted score">
            {ps ? <span className="font-mono text-sm">{ps.home}–{ps.away}</span> : <span className="text-base-content/30">—</span>}
          </div>
          <div className="col-start-2 flex min-w-0 items-center gap-2 md:col-start-auto">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 font-mono text-sm font-bold text-primary">{pickCode(p.pick.outcome)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{pickLabel(tip)}{ps && <span className="ml-1 text-base-content/50 md:hidden">({ps.home}–{ps.away})</span>}</p>
              <p className="truncate text-xs text-base-content/50" title={p.markets?.map(marketLabel).join(' · ')}>{p.markets?.map((m) => `${marketLabel(m)}${m.odds ? ` @${m.odds}` : ''}`).join(' · ') || 'Winner only'}</p>
              {(p.source === 'market' || p.value) && (
                <p className="mt-0.5 flex flex-wrap gap-1">
                  {p.source === 'market' && <span className="badge badge-xs badge-ghost gap-1" title="Our model has no data for this competition yet, so this tip is the bookmakers' consensus"><Landmark className="size-3" />Bookmakers</span>}
                  {p.value && (
                    <span className="badge badge-xs badge-accent badge-soft gap-1" title={`Our model ${pct(p.value.modelProbability)} vs bookmakers ${pct(p.value.marketProbability)}`}>
                      <Gem className="size-3" />Value: {OUTCOME_LABEL(tip, p.value.outcome)} @{p.value.odds}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="col-start-2 flex items-center gap-2 md:col-start-auto">
            <progress className={`progress progress-primary ${p.pick.odds ? 'w-10' : 'w-16'}`} value={Math.round(p.pick.probability * 100)} max="100" />
            <span className="whitespace-nowrap font-mono text-xs" title={sourceTitle(p)}>{formatProb(p.pick.probability)}{p.pick.odds ? <span className="text-base-content/50"> @{p.pick.odds}</span> : null}</span>
            <span className={`badge badge-xs ${CONFIDENCE[p.confidence]}`}>{p.confidence}</span>
          </div>
        </>
      )}

      <div className="col-start-2 md:col-start-auto md:text-right"><ResultBadge tip={tip} /></div>
    </li>
  );
}

function groupByLeague(items) {
  const groups = new Map();
  for (const t of items) {
    const key = `${t.league?.id}|${t.league?.name}`;
    if (!groups.has(key)) groups.set(key, { league: t.league, items: [] });
    groups.get(key).items.push(t);
  }
  return [...groups.values()];
}

function Record({ record }) {
  if (!record?.settled) return <p className="text-sm text-base-content/60">The track record fills in as results come in.</p>;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <span><span className="font-mono font-semibold text-success">{formatProb(record.hitRate)}</span> of {record.settled} settled tips correct (30 days)</span>
      {record.featuredSettled > 0 && (
        <span><span className="font-mono font-semibold text-primary">{formatProb(record.featuredHitRate)}</span> of {record.featuredSettled} top tips correct</span>
      )}
      {record.staked > 0 && (
        <span title="Profit or loss if you had staked 1 unit on every tip with a price, at the bookmakers' consensus odds">
          <span className={`font-mono font-semibold ${record.roi >= 0 ? 'text-success' : 'text-error'}`}>{record.roi >= 0 ? '+' : ''}{(record.roi * 100).toFixed(1)}%</span> return at bookmaker odds ({record.staked} tips)
        </span>
      )}
    </div>
  );
}

export default function TipsBoard({ inApp = false }) {
  const { isAuthenticated } = useAuth();
  const { legal } = useSiteConfig();
  const [params, setParams] = useSearchParams();
  const sport = params.get('sport') || undefined;
  const date = params.get('date') || utcDay(0);
  const topOnly = params.get('top') === '1';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    setError('');
    tipsApi.list({ sport, date })
      .then((d) => live && setData(d))
      .catch(() => live && setError('Tips could not be loaded. Please try again.'));
    return () => { live = false; };
  }, [sport, date, isAuthenticated, reloadKey]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  const items = useMemo(() => (data?.items || []).filter((t) => !topOnly || t.featured), [data, topOnly]);
  const groups = useMemo(() => groupByLeague(items), [items]);
  const locked = items.filter((t) => t.locked).length;
  const upgradeTo = isAuthenticated ? '/app/billing' : '/register?plan=pro';
  const active = data?.sport;
  const model = data?.items?.find((t) => t.model)?.model;

  return (
    <div>
      <div role="tablist" className="tabs tabs-box mb-3 w-full overflow-x-auto sm:w-fit">
        {(data?.sports || Object.keys(SPORTS)).map((s) => {
          const Icon = SPORTS[s]?.icon;
          return (
            <button key={s} type="button" role="tab" aria-selected={active === s} onClick={() => update({ sport: s })}
              className={`tab gap-2 whitespace-nowrap ${active === s ? 'tab-active' : ''}`}>
              {Icon && <Icon className="size-4" />} {SPORTS[s]?.label ?? s}
              {data?.counts?.[s] ? <span className="badge badge-xs">{data.counts[s]}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="join">
          {DAYS.map(({ offset, label }) => {
            const d = utcDay(offset);
            return (
              <button key={offset} type="button" onClick={() => update({ date: offset === 0 ? null : d })}
                className={`btn btn-sm join-item ${date === d ? 'btn-primary' : 'btn-ghost border-base-content/10'}`}>{label}</button>
            );
          })}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={topOnly} onChange={(e) => update({ top: e.target.checked ? '1' : null })} />
          <Flame className="size-4 text-primary" /> Top tips only
        </label>
      </div>

      <div className="glass-card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Record record={data?.record} />
        {data && !data.access.full && (
          <Link to={upgradeTo} className="btn btn-primary btn-sm shrink-0">
            <Sparkles className="size-4" /> {locked ? `Unlock ${locked} more tip${locked === 1 ? '' : 's'}` : 'See every tip'}
          </Link>
        )}
      </div>

      {error ? (
        <div className="alert alert-error"><span>{error}</span><button type="button" className="btn btn-sm" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw className="size-4" />Retry</button></div>
      ) : !data ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-box" />)}</div>
      ) : groups.length === 0 ? (
        <EmptyState icon={SPORTS[active]?.icon ?? Flame} title={topOnly ? 'No top tips for this day' : 'No tips for this day yet'}>
          {topOnly ? 'Switch off "Top tips only" to see every tip.' : 'Tips are published at 05:00 and 15:00 UTC for today and tomorrow.'}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {!data.access.full && data.access.previewCount > 0 && locked > 0 && (
            <p className="text-sm text-base-content/60">
              You're seeing {data.access.previewCount} free tip{data.access.previewCount === 1 ? '' : 's'} per sport before kick-off. Finished matches always show the tip and result.
            </p>
          )}
          {groups.map(({ league, items: rows }) => (
            <section key={`${league?.id}-${league?.name}`} className="glass-card overflow-hidden">
              <header className="flex items-center gap-2 border-b border-base-content/10 bg-base-content/[0.03] px-4 py-2.5">
                {league?.logo && <img src={league.logo} alt="" className="size-5 object-contain" loading="lazy" />}
                <h3 className="truncate text-sm font-semibold">{league?.name}</h3>
                {league?.country && <span className="truncate text-xs text-base-content/50">{league.country}</span>}
                <span className="ml-auto text-xs text-base-content/40">{rows.length}</span>
              </header>
              <ul className="divide-y divide-base-content/5">
                {rows.map((t) => <TipRow key={t.id} tip={t} upgradeTo={upgradeTo} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      <PromoBanner className="mt-8" />

      <div className="mt-8 space-y-2 text-xs text-base-content/50">
        {model && <p><span className="font-medium text-base-content/70">{model.name}:</span> {model.description} Tips don't account for injuries, line-ups or motivation.</p>}
        <p>Times are shown in your local time; days follow UTC. 18+ only. Predictions are estimates, not guarantees. Never stake more than you can afford to lose.{legal?.disclaimer ? ` ${legal.disclaimer}` : ''}</p>
        {!inApp && !isAuthenticated && <p><Link to="/register" className="link link-primary">Create a free account</Link> to save predictions and get alerts.</p>}
      </div>
    </div>
  );
}
