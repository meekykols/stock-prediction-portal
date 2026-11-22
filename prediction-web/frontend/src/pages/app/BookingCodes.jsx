import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, Check, CircleCheck, CircleX, Clock, Copy, ExternalLink, Lock, Sparkles, Ticket } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { codesApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDateTime } from '../../utils/format';
import { selectionPick } from '../../utils/sports';

const RESULT = {
  won: { cls: 'badge-success', icon: CircleCheck, label: 'Won' },
  lost: { cls: 'badge-error', icon: CircleX, label: 'Lost' },
  void: { cls: 'badge-ghost', icon: Ban, label: 'Void' },
};

function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function startsIn(date, now) {
  const mins = Math.round((new Date(date) - now) / 60000);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return h < 48 ? `${h}h ${mins % 60}m` : `${Math.floor(h / 24)}d`;
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function SelectionRow({ s }) {
  const r = RESULT[s.result];
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{s.label}</p>
        <p className="truncate text-xs text-base-content/50">{[s.league, s.kickoff && formatDateTime(s.kickoff)].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="badge badge-sm badge-primary badge-soft">{selectionPick(s)}</span>
        {r ? <r.icon className={`size-4 ${s.result === 'won' ? 'text-success' : s.result === 'lost' ? 'text-error' : 'text-base-content/40'}`} aria-label={r.label} /> : null}
      </div>
    </li>
  );
}

function CodeCard({ item, platform, now, upgradeTo }) {
  const [copied, setCopied] = useState(false);
  const live = new Date(item.expiresAt) > now;
  const countdown = startsIn(item.expiresAt, now);
  const result = RESULT[item.result?.state];

  const copy = async () => {
    try {
      const { code } = await codesApi.copy(item.id);
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Copied ${code}. Paste it in ${platform?.name ?? 'the app'}'s "Load booking code".`);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      toast.error(e?.response ? errorMessage(e) : 'Copy failed. Select the code and copy it by hand.');
    }
  };

  return (
    <article className="glass-card flex flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b border-base-content/10 px-4 py-3">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: platform?.color || '#888' }} />
        <span className="truncate font-semibold">{platform?.name ?? item.platform}</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-base-content/60">
          {live
            ? <><Clock className="size-3.5" />Starts in {countdown}</>
            : result ? <span className={`badge badge-sm badge-soft gap-1 ${result.cls}`}><result.icon className="size-3.5" />{result.label}</span>
              : <span className="badge badge-sm badge-info badge-soft">In play</span>}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {item.locked ? (
          <div className="flex items-center justify-between gap-3 rounded-box border border-dashed border-base-content/15 p-3">
            <span className="select-none font-mono text-2xl tracking-widest blur-sm" aria-hidden>XXXXXX</span>
            <Link to={upgradeTo} className="btn btn-primary btn-sm"><Lock className="size-4" />Unlock</Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-box bg-base-content/5 p-3">
            <span className="select-all break-all font-mono text-2xl font-bold tracking-wider">{item.code}</span>
            {live && (
              <button type="button" onClick={copy} className={`btn btn-sm ${copied ? 'btn-success' : 'btn-primary'}`} aria-label={`Copy code ${item.code}`}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {item.odds && <span>Total odds <span className="font-mono font-semibold text-primary">{item.odds.toFixed(2)}</span></span>}
          <span className="text-base-content/60">{item.locked ? item.selectionsCount : item.selections.length} selection{(item.locked ? item.selectionsCount : item.selections.length) === 1 ? '' : 's'}</span>
          {item.postedBy && <span className="text-base-content/50">by {item.postedBy}</span>}
        </div>

        {!item.locked && item.selections.length > 0 && (
          <ul className="divide-y divide-base-content/5">{item.selections.map((s, i) => <SelectionRow key={i} s={s} />)}</ul>
        )}
        {!item.locked && item.note && <p className="text-sm text-base-content/70">“{item.note}”</p>}

        {!item.locked && live && platform?.website && (
          <a href={platform.website} target="_blank" rel="noopener noreferrer nofollow" className="link link-hover mt-auto inline-flex items-center gap-1 text-xs text-base-content/60">
            Open {platform.name}<ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </article>
  );
}

export default function BookingCodes() {
  useDocumentTitle('Booking codes');
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'recent' ? 'recent' : 'active';
  const platform = params.get('platform') || '';
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    setData(null);
    codesApi.list({ view, platform: platform || undefined })
      .then((d) => live && setData(d))
      .catch((e) => { if (live) { toast.error(errorMessage(e)); setData({ items: [], platforms: [], access: {} }); } });
    return () => { live = false; };
  }, [view, platform]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };
  const platforms = new Map((data?.platforms || []).map((p) => [p.slug, p]));
  const planNames = (data?.access?.plans || []).map(titleCase).join(', ').replace(/, ([^,]*)$/, ' and $1');

  return (
    <>
      <PageHeader title="Booking codes" subtitle="Ready-made slips from our tipsters. Copy a code, load it in your betting app and check the selections before you stake." />

      {data?.enabled === false ? (
        <EmptyState icon={Ticket} title="Booking codes are not available right now">Check back soon.</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" className="tabs tabs-box">
              <button type="button" role="tab" aria-selected={view === 'active'} className={`tab ${view === 'active' ? 'tab-active' : ''}`} onClick={() => set({ view: null })}>Live</button>
              <button type="button" role="tab" aria-selected={view === 'recent'} className={`tab ${view === 'recent' ? 'tab-active' : ''}`} onClick={() => set({ view: 'recent' })}>Results</button>
            </div>
            <select className="select select-sm w-auto" value={platform} onChange={(e) => set({ platform: e.target.value })} aria-label="Betting platform">
              <option value="">All platforms</option>
              {(data?.platforms || []).map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </div>

          {data && !data.access.allowed && view === 'active' && (
            <div className="alert alert-info alert-soft mb-6">
              <Lock className="size-5" />
              <span>Live booking codes are included in {planNames || 'selected plans'}. Codes unlock for everyone once the first match starts.</span>
              <Link to="/app/billing" className="btn btn-sm btn-primary"><Sparkles className="size-4" />Upgrade</Link>
            </div>
          )}

          {!data ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-64 rounded-box" />)}</div>
          ) : data.items.length === 0 ? (
            <EmptyState icon={Ticket} title={view === 'active' ? 'No live codes right now' : 'No results in the last two weeks'}>
              {view === 'active' ? 'New codes appear here as soon as our tipsters post them.' : 'Settled codes show here for 14 days.'}
            </EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map((c) => <CodeCard key={c.id} item={c} platform={platforms.get(c.platform)} now={now} upgradeTo="/app/billing" />)}
            </div>
          )}
          <p className="mt-8 text-xs text-base-content/50">18+ only. Odds and availability are set by each bookmaker and can change. We are not a bookmaker and don&apos;t take bets. Never stake more than you can afford to lose.</p>
        </>
      )}
    </>
  );
}
