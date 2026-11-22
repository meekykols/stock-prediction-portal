import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bitcoin, Check, CircleCheck, CircleX, Clock, ExternalLink, Lock, Pause, Send, ShieldCheck, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { cryptoApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDateTime } from '../../utils/format';

const KIND_LABEL = { manual: 'Analyst', swing: 'Swing', day: 'Day trade' };
const EXCHANGE = { binance: 'Binance', bybit: 'Bybit' };
const kindOf = (s) => (s.source === 'manual' ? 'manual' : s.style);
const price = (v) => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 }));
const r = (v) => `${v > 0 ? '+' : ''}${v}R`;

function statusBadge(s) {
  if (s.status === 'pending') return { cls: 'badge-ghost', icon: Clock, text: 'Waiting for entry' };
  if (s.status === 'active') {
    const hits = s.tpHit?.filter(Boolean).length;
    return { cls: 'badge-info', icon: TrendingUp, text: hits ? `In trade · TP${hits} hit` : 'In trade' };
  }
  if (s.status === 'closed') return s.resultR > 0
    ? { cls: 'badge-success', icon: CircleCheck, text: `${r(s.resultR)} · ${s.outcome === 'manual' ? 'closed early' : s.outcome.toUpperCase()}` }
    : { cls: 'badge-error', icon: CircleX, text: `${r(s.resultR)} · ${s.outcome === 'sl' ? 'stopped' : s.outcome === 'time' ? 'time limit' : s.outcome}` };
  if (s.status === 'expired') return { cls: 'badge-ghost', icon: Clock, text: 'Entry not reached' };
  return { cls: 'badge-ghost', icon: CircleX, text: 'Cancelled' };
}

function SignalCard({ s }) {
  const long = s.side === 'long';
  if (s.locked) {
    return (
      <article className="glass-card flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="badge badge-sm badge-ghost">{KIND_LABEL[kindOf(s)]} · {EXCHANGE[s.exchange]} · {s.timeframe}</span>
          <span className="text-xs text-base-content/50">{formatDateTime(s.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3 rounded-box border border-dashed border-base-content/15 p-4">
          <Lock className="size-5 text-base-content/50" />
          <div className="flex-1 select-none blur-sm" aria-hidden><p className="font-mono">LONG BTCUSDT · 61,000</p></div>
          <Link to="/app/billing" className="btn btn-primary btn-sm">Unlock</Link>
        </div>
        {s.rr?.length > 0 && <p className="text-xs text-base-content/60">Targets {s.rr.map((x) => `${x}R`).join(' / ')}</p>}
      </article>
    );
  }
  const st = statusBadge(s);
  const rows = [
    { label: s.entryType === 'market' ? 'Entry (market)' : 'Entry (limit)', value: s.entry, done: Boolean(s.filledAt) },
    ...s.tps.map((tp, i) => ({ label: `TP${i + 1} · ${s.rr[i]}R`, value: tp, done: s.tpHit?.[i], tone: 'text-success' })),
    { label: s.stop === s.entry && s.sl !== s.entry ? 'Stop (moved to entry)' : 'Stop-loss', value: s.stop ?? s.sl, done: s.outcome === 'sl', tone: 'text-error' },
  ];
  return (
    <article className="glass-card flex flex-col gap-4 p-5">
      <header className="flex flex-wrap items-center gap-2">
        <span className={`badge gap-1 font-semibold ${long ? 'badge-success' : 'badge-error'}`}>{long ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}{long ? 'LONG' : 'SHORT'}</span>
        <h3 className="font-mono text-lg font-bold">{s.symbol}</h3>
        <span className="text-xs text-base-content/60">{EXCHANGE[s.exchange]} · {s.timeframe} · {KIND_LABEL[kindOf(s)]}</span>
        <span className={`badge badge-sm badge-soft ml-auto gap-1 ${st.cls}`}><st.icon className="size-3.5" />{st.text}</span>
      </header>
      <ul className="divide-y divide-base-content/5 rounded-box bg-base-content/5 px-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-base-content/70">{row.label}</span>
            <span className={`flex items-center gap-1.5 font-mono font-semibold ${row.tone || ''}`}>{price(row.value)}{row.done && <Check className="size-3.5" />}</span>
          </li>
        ))}
      </ul>
      {s.note && <p className="text-sm text-base-content/70">“{s.note}”</p>}
      <p className="mt-auto text-xs text-base-content/50">
        {s.postedBy ? `By ${s.postedBy} · ` : ''}{formatDateTime(s.createdAt)}
        {s.status === 'pending' && s.expiresAt && ` · expires ${formatDateTime(s.expiresAt)}`}
      </p>
    </article>
  );
}

function TelegramCard() {
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState(null);
  const load = useCallback(() => cryptoApi.telegram().then(setStatus).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  // While a link code is out, check every few seconds whether the bot has linked the chat.
  useEffect(() => {
    if (!pending) return undefined;
    const t = setInterval(async () => {
      const s = await cryptoApi.telegram().catch(() => null);
      if (s?.linked) { setStatus(s); setPending(null); toast.success('Telegram connected'); }
    }, 3000);
    return () => clearInterval(t);
  }, [pending]);

  if (!status?.available) return null;
  const connect = async () => {
    try { setPending(await cryptoApi.telegramLink()); } catch (e) { toast.error(errorMessage(e)); }
  };
  const disconnect = async () => {
    try { await cryptoApi.telegramUnlink(); toast.success('Telegram disconnected'); load(); } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <div className="glass-card flex flex-wrap items-center gap-4 p-4">
      <Send className="size-6 text-info" />
      <div className="min-w-48 flex-1">
        <p className="font-semibold">Telegram alerts</p>
        <p className="text-sm text-base-content/60">
          {status.linked ? `Connected${status.username ? ` as @${status.username}` : ''}. New signals and every TP or stop update arrive in Telegram.`
            : pending ? <>Open the bot and press Start{pending.link ? '' : <> or send <code className="font-mono">/start {pending.code}</code> to @{status.bot}</>}. This page updates when you&apos;re connected.</>
              : 'Get new signals and live updates (TP hit, stopped out) in Telegram.'}
        </p>
      </div>
      {status.linked
        ? <button type="button" className="btn btn-ghost btn-sm" onClick={disconnect}>Disconnect</button>
        : pending?.link
          ? <a href={pending.link} target="_blank" rel="noopener noreferrer" className="btn btn-info btn-sm"><ExternalLink className="size-4" />Open Telegram</a>
          : <button type="button" className="btn btn-info btn-sm" onClick={connect} disabled={Boolean(pending)}><Send className="size-4" />Connect Telegram</button>}
    </div>
  );
}

function Record({ record }) {
  const o = record?.overall;
  if (!o?.n) return <p className="text-sm text-base-content/60">The 30-day track record fills in as signals close.</p>;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <span><span className="font-mono font-semibold">{o.n}</span> closed (30 days)</span>
      <span><span className="font-mono font-semibold text-success">{Math.round(o.winRate * 100)}%</span> in profit</span>
      <span>Average <span className={`font-mono font-semibold ${o.avgR >= 0 ? 'text-success' : 'text-error'}`}>{r(o.avgR)}</span> per signal</span>
      <span>Total <span className={`font-mono font-semibold ${o.totalR >= 0 ? 'text-success' : 'text-error'}`}>{r(o.totalR)}</span></span>
    </div>
  );
}

export default function CryptoSignals() {
  useDocumentTitle('Crypto signals');
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'closed' ? 'closed' : 'live';
  const kind = params.get('kind') || '';
  const [data, setData] = useState(null);

  const load = useCallback(() => cryptoApi.feed({ view, kind: kind || undefined }).then(setData).catch((e) => toast.error(errorMessage(e))), [view, kind]);
  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };
  const kinds = [['', 'All'], ['manual', 'Analyst'], ...(data?.styles?.swing !== false ? [['swing', 'Swing']] : []), ...(data?.styles?.day !== false ? [['day', 'Day trade']] : [])];
  const locked = data?.items?.filter((s) => s.locked).length ?? 0;

  return (
    <>
      <PageHeader title="Crypto signals" subtitle="Futures signals for Binance and Bybit with entry, stop-loss and take-profits, tracked live until they close." />
      <div className="space-y-4">
        <TelegramCard />
        {data?.paused && <div className="alert alert-warning alert-soft"><Pause className="size-5" /><span>New signals are paused{data.paused.reason ? `: ${data.paused.reason}` : ''}. Open trades are still tracked.</span></div>}
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
          <Record record={data?.record} />
          {locked > 0 && view === 'live' && <Link to="/app/billing" className="btn btn-primary btn-sm"><Sparkles className="size-4" />Unlock {locked} live signal{locked === 1 ? '' : 's'}</Link>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="tabs tabs-box">
            {[['live', 'Live'], ['closed', 'Results']].map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={`tab ${view === v ? 'tab-active' : ''}`} onClick={() => set({ view: v === 'live' ? null : v })}>{l}</button>
            ))}
          </div>
          <div className="join">
            {kinds.map(([v, l]) => (
              <button key={l} type="button" className={`btn btn-sm join-item ${kind === v ? 'btn-primary' : 'btn-ghost border-base-content/10'}`} onClick={() => set({ kind: v || null })}>{l}</button>
            ))}
          </div>
        </div>

        {!data ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-72 rounded-box" />)}</div>
        ) : data.enabled === false ? (
          <EmptyState icon={Bitcoin} title="Crypto signals are not available right now">Check back soon.</EmptyState>
        ) : !data.items.length ? (
          <EmptyState icon={Bitcoin} title={view === 'live' ? 'No open signals right now' : 'No results in the last 30 days'}>
            {view === 'live' ? 'New signals appear here, and in Telegram if you connect it.' : 'Closed signals stay here for 30 days.'}
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.items.map((s) => <SignalCard key={s.id} s={s} />)}</div>
        )}

        <div className="flex gap-3 rounded-box border border-base-content/10 p-4 text-xs text-base-content/60">
          <ShieldCheck className="size-5 shrink-0" />
          <p>
            Results are in R, multiples of the amount risked (the distance to the stop-loss). Each take-profit closes an equal share; after TP1 the stop moves to entry.
            Fees of 0.05% per side are included. Futures trading is high risk and leverage can lose more than you expect: size positions so a stop costs only a small part of your account.
            Signals are not financial advice. 18+ only.
          </p>
        </div>
      </div>
    </>
  );
}
