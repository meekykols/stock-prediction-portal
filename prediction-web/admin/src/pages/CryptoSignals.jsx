import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Pause, Play, RefreshCw, Save, Search, Send, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { cryptoApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime, fullName } from '../utils/format';

const KIND = { manual: 'Staff', swing: 'Swing', day: 'Day trade' };
const STATUS_BADGE = { pending: 'badge-ghost', active: 'badge-info', closed: 'badge-success', expired: 'badge-ghost', cancelled: 'badge-ghost' };
const num = (v) => (v === '' || v == null ? null : Number(v));
const price = (v) => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 }));
const r = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v}R`);
const kindOf = (s) => (s.source === 'manual' ? 'manual' : s.style);

// Same rules as the server (utils/signalMath.js), for instant feedback.
function check({ side, entry, sl, tps }) {
  const d = side === 'long' ? 1 : -1;
  if (!(entry > 0) || !(sl > 0) || !tps.length) return { error: 'Fill in the stop-loss and at least one take-profit' };
  if (d * (entry - sl) <= 0) return { error: `The stop-loss must be ${side === 'long' ? 'below' : 'above'} the entry` };
  let prev = entry;
  for (const [i, tp] of tps.entries()) {
    if (d * (tp - prev) <= 0) return { error: `TP${i + 1} must be ${side === 'long' ? 'above' : 'below'} ${i ? `TP${i}` : 'the entry'}` };
    prev = tp;
  }
  const risk = Math.abs(entry - sl);
  return { rr: tps.map((tp) => Math.round((d * (tp - entry) / risk) * 100) / 100), riskPct: (risk / entry) * 100 };
}

function PostForm({ config, onPosted }) {
  const [f, setF] = useState({ exchange: 'binance', symbol: 'BTC', timeframe: '1h', side: 'long', entryType: 'market', entry: '', sl: '', tp1: '', tp2: '', tp3: '', note: '' });
  const [market, setMarket] = useState(null);
  const [candles, setCandles] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const lookup = useCallback(async () => {
    try {
      const m = await cryptoApi.market(f.exchange, f.symbol);
      setMarket(m);
      const c = await cryptoApi.candles(f.exchange, m.symbol, f.timeframe);
      setCandles(c.candles.map((k) => ({ t: k.t, c: k.c })));
    } catch (e) { setMarket(null); setCandles([]); toast.error(errorMessage(e)); }
  }, [f.exchange, f.symbol, f.timeframe]);
  useEffect(() => { lookup(); }, [f.exchange, f.timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  const entry = f.entryType === 'market' ? market?.price : num(f.entry);
  const tps = [f.tp1, f.tp2, f.tp3].map(num).filter((v) => v != null);
  const preview = useMemo(() => (entry ? check({ side: f.side, entry, sl: num(f.sl), tps }) : null), [entry, f.side, f.sl, tps.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = f.timeframe === '15m' ? 'day' : 'swing';
  const styleOff = config && !config.styles[style].enabled;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await cryptoApi.create({
        exchange: f.exchange, symbol: market?.symbol || f.symbol, timeframe: f.timeframe, side: f.side, entryType: f.entryType,
        ...(f.entryType === 'limit' && { entry: num(f.entry) }), sl: num(f.sl), tps, note: f.note || undefined,
      });
      toast.success(`${res.message}: ${res.data.side.toUpperCase()} ${res.data.symbol}`);
      setF({ ...f, entry: '', sl: '', tp1: '', tp2: '', tp3: '', note: '' });
      onPosted();
    } catch (e) { toast.error(Object.values(fieldErrors(e))[0] || errorMessage(e)); } finally { setSaving(false); }
  };

  const lines = [
    entry && { y: entry, label: 'Entry', color: '#38bdf8' },
    num(f.sl) && { y: num(f.sl), label: 'SL', color: '#f87171' },
    ...tps.map((tp, i) => ({ y: tp, label: `TP${i + 1}`, color: '#4ade80' })),
  ].filter(Boolean);
  const ys = [...candles.map((c) => c.c), ...lines.map((l) => l.y)];

  return (
    <div className="glass-card grid gap-6 p-5 xl:grid-cols-[22rem_1fr]">
      <div className="space-y-3">
        <h3 className="font-semibold">Post a signal</h3>
        <div className="grid grid-cols-2 gap-2">
          <select className="select select-sm" value={f.exchange} onChange={set('exchange')} aria-label="Exchange">
            {['binance', 'bybit'].map((x) => <option key={x} value={x} disabled={config && !config.exchanges[x]}>{x === 'binance' ? 'Binance' : 'Bybit'}{config && !config.exchanges[x] ? ' (off)' : ''}</option>)}
          </select>
          <select className="select select-sm" value={f.timeframe} onChange={set('timeframe')} aria-label="Timeframe">
            <option value="15m">15m · day trade</option><option value="1h">1h · swing</option><option value="4h">4h · swing</option>
          </select>
        </div>
        <div className="join w-full">
          <input className="input input-sm join-item w-full font-mono uppercase" value={f.symbol} onChange={set('symbol')} onKeyDown={(e) => e.key === 'Enter' && lookup()} placeholder="Coin, e.g. BTC" aria-label="Coin" />
          <button type="button" className="btn btn-sm join-item" onClick={lookup}><Search className="size-4" />Check</button>
        </div>
        {market && <p className="text-xs text-base-content/60"><span className="font-mono">{market.symbol}</span> · last <span className="font-mono font-semibold text-base-content">{price(market.price)}</span> · tick {market.tickSize}</p>}
        <div className="grid grid-cols-2 gap-2">
          <div className="join">
            {['long', 'short'].map((sd) => <button key={sd} type="button" className={`btn btn-sm join-item flex-1 ${f.side === sd ? (sd === 'long' ? 'btn-success' : 'btn-error') : ''}`} onClick={() => setF({ ...f, side: sd })}>{sd === 'long' ? 'Long' : 'Short'}</button>)}
          </div>
          <div className="join">
            {['market', 'limit'].map((t) => <button key={t} type="button" className={`btn btn-sm join-item flex-1 ${f.entryType === t ? 'btn-primary' : ''}`} onClick={() => setF({ ...f, entryType: t })}>{t === 'market' ? 'Market' : 'Limit'}</button>)}
          </div>
        </div>
        {f.entryType === 'limit' && <input type="number" step="any" className="input input-sm w-full" value={f.entry} onChange={set('entry')} placeholder="Limit entry price" aria-label="Entry" />}
        <input type="number" step="any" className="input input-sm w-full" value={f.sl} onChange={set('sl')} placeholder="Stop-loss" aria-label="Stop-loss" />
        <div className="grid grid-cols-3 gap-2">
          {['tp1', 'tp2', 'tp3'].map((k, i) => <input key={k} type="number" step="any" className="input input-sm" value={f[k]} onChange={set(k)} placeholder={`TP${i + 1}${i ? ' (opt.)' : ''}`} aria-label={`TP${i + 1}`} />)}
        </div>
        <textarea className="textarea textarea-sm w-full" rows={2} maxLength={500} value={f.note} onChange={set('note')} placeholder="Note for customers (optional): the setup, invalidation…" />
        {preview && (preview.error
          ? <p className="text-xs text-error">{preview.error}</p>
          : <p className="text-xs text-base-content/70">Risk {preview.riskPct.toFixed(2)}% of price · targets {preview.rr.map((x) => `${x}R`).join(' / ')}{preview.rr[0] < 1 ? <span className="text-warning"> · TP1 is below 1R</span> : ''}</p>)}
        {styleOff && <p className="text-xs text-warning">{style === 'day' ? 'Day-trading' : 'Swing'} signals are switched off in settings.</p>}
        <button type="button" className="btn btn-primary btn-sm w-full" onClick={submit} disabled={saving || !market || preview?.error || styleOff || config?.paused?.on}>
          {saving ? <span className="loading loading-spinner loading-xs" /> : <Send className="size-4" />}{config?.paused?.on ? 'Signals are paused' : 'Post signal'}
        </button>
      </div>
      <div className="min-h-72">
        {candles.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={candles} margin={{ left: 8, right: 48, top: 8 }}>
              <CartesianGrid strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' })} minTickGap={60} fontSize={11} />
              <YAxis domain={[Math.min(...ys) * 0.998, Math.max(...ys) * 1.002]} tickFormatter={(v) => price(+v.toPrecision(6))} width={72} fontSize={11} />
              <Tooltip labelFormatter={(t) => formatDateTime(t)} formatter={(v) => price(v)} />
              <Line type="monotone" dataKey="c" stroke="#a78bfa" dot={false} strokeWidth={1.5} isAnimationActive={false} name="Close" />
              {lines.map((l) => <ReferenceLine key={l.label} y={l.y} stroke={l.color} strokeDasharray="4 3" label={{ value: l.label, position: 'right', fill: l.color, fontSize: 11 }} />)}
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="grid h-full place-items-center text-sm text-base-content/50">Check a coin to see its {f.timeframe} chart.</div>}
      </div>
    </div>
  );
}

function Settings({ onSaved }) {
  const [c, setC] = useState(null);
  const [plans, setPlans] = useState([]);
  const [tg, setTg] = useState(false);
  const [coin, setCoin] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { cryptoApi.config().then((d) => { setC(d.config); setPlans(d.plans); setTg(d.telegramConfigured); }).catch((e) => toast.error(errorMessage(e))); }, []);
  if (!c) return <div className="skeleton h-72 rounded-box" />;
  const upd = (path, value) => setC((prev) => {
    const next = structuredClone(prev);
    const keys = path.split('.');
    keys.slice(0, -1).reduce((o, k) => o[k], next)[keys.at(-1)] = value;
    return next;
  });
  const togglePlan = (kind, slug) => upd(`plans.${kind}`, c.plans[kind].includes(slug) ? c.plans[kind].filter((x) => x !== slug) : [...c.plans[kind], slug]);
  const save = async (patch) => {
    setSaving(true);
    try {
      const body = patch || { enabled: c.enabled, paused: c.paused, styles: c.styles, coins: c.coins, exchanges: c.exchanges, plans: c.plans, rules: c.rules, telegram: c.telegram };
      const res = await cryptoApi.saveConfig(body);
      setC(res.data); toast.success(res.message); onSaved(res.data);
    } catch (e) { toast.error(Object.values(fieldErrors(e))[0] || errorMessage(e)); } finally { setSaving(false); }
  };
  const Toggle = ({ path, label }) => {
    const v = path.split('.').reduce((o, k) => o?.[k], c);
    return <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">{label}<input type="checkbox" className="toggle toggle-sm toggle-primary" checked={Boolean(v)} onChange={(e) => upd(path, e.target.checked)} /></label>;
  };
  const addCoin = () => {
    const s = coin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s) upd('coins.fixed.list', [...new Set([...c.coins.fixed.list, s.endsWith('USDT') ? s : `${s}USDT`])]);
    setCoin('');
  };

  return (
    <div className="space-y-4">
      <div className={`glass-card flex flex-wrap items-center gap-3 p-4 ${c.paused.on ? 'border border-warning/50' : ''}`}>
        {c.paused.on ? <Pause className="size-5 text-warning" /> : <Play className="size-5 text-success" />}
        <p className="flex-1 text-sm">{c.paused.on ? <>New signals are <b>paused</b>{c.paused.reason ? `: ${c.paused.reason}` : ''}. Open trades are still tracked and updated.</> : 'Signals are live.'}</p>
        {!c.paused.on && <input className="input input-sm w-56" placeholder="Reason, e.g. US CPI at 13:30" value={c.paused.reason || ''} onChange={(e) => upd('paused.reason', e.target.value)} />}
        <button type="button" className={`btn btn-sm ${c.paused.on ? 'btn-success' : 'btn-warning'}`} disabled={saving}
          onClick={() => save({ paused: { on: !c.paused.on, reason: c.paused.on ? null : c.paused.reason || null } })}>
          {c.paused.on ? <><Play className="size-4" />Resume</> : <><Pause className="size-4" />Pause signals</>}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass-card space-y-3 p-5">
          <h3 className="font-semibold">Trading styles & exchanges</h3>
          <Toggle path="enabled" label="Crypto signals on" />
          <Toggle path="styles.swing.enabled" label="Swing (1h / 4h)" />
          <Toggle path="styles.day.enabled" label="Day trading (15m)" />
          <Toggle path="exchanges.binance" label="Binance Futures" />
          <Toggle path="exchanges.bybit" label="Bybit Futures" />
          <Toggle path="telegram.enabled" label="Telegram alerts" />
          {!tg && <p className="text-xs text-warning">Telegram isn&apos;t set up: add TELEGRAM_BOT_TOKEN to backend/.env and restart.</p>}
        </div>

        <div className="glass-card space-y-3 p-5">
          <h3 className="font-semibold">Coins watched by strategies</h3>
          <Toggle path="coins.top.enabled" label="Top coins by futures volume" />
          {c.coins.top.enabled && (
            <div className="flex items-center gap-2 text-sm">Top
              <input type="number" min={1} max={100} className="input input-sm w-20" value={c.coins.top.n} onChange={(e) => upd('coins.top.n', Number(e.target.value))} />
              on <select className="select select-sm w-auto" value={c.coins.top.exchange} onChange={(e) => upd('coins.top.exchange', e.target.value)}><option value="binance">Binance</option><option value="bybit">Bybit</option></select>
            </div>
          )}
          <Toggle path="coins.fixed.enabled" label="Fixed list" />
          {c.coins.fixed.enabled && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {c.coins.fixed.list.map((s) => <span key={s} className="badge badge-primary badge-soft gap-1 font-mono">{s}<button type="button" onClick={() => upd('coins.fixed.list', c.coins.fixed.list.filter((x) => x !== s))} aria-label={`Remove ${s}`}><X className="size-3" /></button></span>)}
              </div>
              <div className="join w-full"><input className="input input-sm join-item w-full font-mono uppercase" value={coin} onChange={(e) => setCoin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCoin()} placeholder="Add, e.g. DOGE" /><button type="button" className="btn btn-sm join-item" onClick={addCoin}>Add</button></div>
            </>
          )}
          <p className="text-xs text-base-content/50">Used by automatic strategies once they pass testing. Staff can post signals for any listed coin.</p>
        </div>

        <div className="glass-card space-y-3 p-5">
          <h3 className="font-semibold">Who sees live signals</h3>
          <table className="table table-xs">
            <thead><tr><th>Plan</th>{Object.entries(KIND).map(([k, l]) => <th key={k} className="text-center">{l}</th>)}</tr></thead>
            <tbody>{plans.map((p) => (
              <tr key={p.slug}><td>{p.name}</td>{Object.keys(KIND).map((k) => (
                <td key={k} className="text-center"><input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={c.plans[k].includes(p.slug)} onChange={() => togglePlan(k, p.slug)} aria-label={`${p.name} sees ${KIND[k]}`} /></td>
              ))}</tr>
            ))}</tbody>
          </table>
          <p className="text-xs text-base-content/50">Also controls Telegram alerts. Finished signals are public as the track record.</p>
        </div>
      </div>

      <div className="glass-card grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
        <label className="form-control text-sm"><span className="mb-1">Fee per side (%)</span><input type="number" step="0.01" min={0} max={1} className="input input-sm" value={+(c.rules.feePct * 100).toFixed(4)} onChange={(e) => upd('rules.feePct', Number(e.target.value) / 100)} /></label>
        <label className="form-control text-sm"><span className="mb-1">Limit expiry, swing / day (h)</span>
          <div className="flex gap-1"><input type="number" className="input input-sm w-full" value={c.rules.limitExpiryHours.swing} onChange={(e) => upd('rules.limitExpiryHours.swing', Number(e.target.value))} /><input type="number" className="input input-sm w-full" value={c.rules.limitExpiryHours.day} onChange={(e) => upd('rules.limitExpiryHours.day', Number(e.target.value))} /></div></label>
        <label className="form-control text-sm"><span className="mb-1">Max hold, swing / day (h)</span>
          <div className="flex gap-1"><input type="number" className="input input-sm w-full" value={c.rules.maxHoldHours.swing} onChange={(e) => upd('rules.maxHoldHours.swing', Number(e.target.value))} /><input type="number" className="input input-sm w-full" value={c.rules.maxHoldHours.day} onChange={(e) => upd('rules.maxHoldHours.day', Number(e.target.value))} /></div></label>
        <label className="form-control text-sm"><span className="mb-1">Max limit distance (%)</span><input type="number" min={0.5} max={50} className="input input-sm" value={c.rules.maxEntryDistancePct} onChange={(e) => upd('rules.maxEntryDistancePct', Number(e.target.value))} /></label>
        <div className="flex flex-col justify-end gap-2"><Toggle path="rules.breakeven" label="Stop to entry after TP1" /></div>
      </div>
      <div className="flex justify-end"><button type="button" className="btn btn-primary btn-sm" onClick={() => save()} disabled={saving}><Save className="size-4" />Save settings</button></div>
    </div>
  );
}

export default function CryptoSignals() {
  useDocumentTitle('Crypto signals');
  const [config, setConfig] = useState(null);
  const [filters, setFilters] = useState({ view: 'open', page: 1 });
  const [list, setList] = useState(null);
  const [stats, setStats] = useState(null);

  const loadList = useCallback(() => cryptoApi.list(filters).then(setList).catch((e) => toast.error(errorMessage(e))), [filters]);
  const loadStats = useCallback(() => cryptoApi.stats().then(setStats).catch(() => {}), []);
  useEffect(() => { cryptoApi.config().then((d) => setConfig(d.config)).catch(() => {}); loadStats(); }, [loadStats]);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (filters.view !== 'open') return undefined; const t = setInterval(loadList, 30000); return () => clearInterval(t); }, [filters.view, loadList]);

  const refresh = () => { loadList(); loadStats(); };
  const cancel = async (s) => {
    const msg = s.status === 'pending' ? `Cancel the ${s.symbol} signal before entry?` : `Close the ${s.symbol} trade at the market price now?`;
    if (!window.confirm(msg)) return;
    try { const res = await cryptoApi.cancel(s.id); toast.success(res.message); refresh(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const trackNow = async () => { try { const res = await cryptoApi.track(); toast.success(res.message); refresh(); } catch (e) { toast.error(errorMessage(e)); } };
  const o = stats?.last30?.overall;

  return (
    <>
      <PageHeader title="Crypto signals" subtitle="Futures signals for Binance and Bybit. Every signal is tracked on 1-minute candles until it closes."
        actions={<button type="button" className="btn btn-ghost btn-sm border-base-content/10" onClick={trackNow}><RefreshCw className="size-4" />Check now</button>} />

      <PostForm config={config} onPosted={refresh} />

      <div className="mb-3 mt-10 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="tabs tabs-box">
          {[['open', 'Open'], ['finished', 'Finished']].map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={filters.view === v} className={`tab ${filters.view === v ? 'tab-active' : ''}`} onClick={() => setFilters({ view: v, page: 1 })}>{l}</button>)}
        </div>
        {o?.n > 0 && <p className="text-sm text-base-content/70">30 days: {o.n} closed · {Math.round(o.winRate * 100)}% in profit · avg {r(o.avgR)} · total {r(o.totalR)}</p>}
      </div>
      {!list ? <div className="skeleton h-40 rounded-box" /> : !list.items.length ? <div className="glass-card p-6 text-sm text-base-content/60">No {filters.view} signals.</div> : (
        <>
          <div className="glass-card overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Posted</th><th>Signal</th><th>Type</th><th className="text-right">Entry</th><th className="text-right">SL</th><th className="text-right">TPs</th><th>Status</th><th className="text-right">Result</th><th>By</th><th /></tr></thead>
              <tbody>{list.items.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(s.createdAt)}</td>
                  <td className="whitespace-nowrap"><span className={`font-semibold ${s.side === 'long' ? 'text-success' : 'text-error'}`}>{s.side.toUpperCase()}</span> <span className="font-mono">{s.symbol}</span><span className="block text-xs text-base-content/50">{s.exchange} · {s.timeframe}</span></td>
                  <td className="text-xs">{KIND[kindOf(s)]}</td>
                  <td className="text-right font-mono text-xs">{price(s.entry)}<span className="block text-base-content/50">{s.entryType}</span></td>
                  <td className="text-right font-mono text-xs">{price(s.stop ?? s.sl)}</td>
                  <td className="text-right font-mono text-xs">{s.tps.map((tp, i) => <span key={tp} className={`block ${s.tpHit?.[i] ? 'text-success' : ''}`}>{price(tp)}{s.tpHit?.[i] ? ' ✓' : ''}</span>)}</td>
                  <td><span className={`badge badge-sm badge-soft ${STATUS_BADGE[s.status]}`}>{s.status}{s.outcome && s.status === 'closed' ? ` · ${s.outcome}` : ''}</span></td>
                  <td className={`text-right font-mono ${s.resultR > 0 ? 'text-success' : s.resultR < 0 ? 'text-error' : ''}`}>{r(s.resultR)}</td>
                  <td className="whitespace-nowrap text-xs">{s.createdBy ? fullName(s.createdBy) : 'Strategy'}</td>
                  <td>{['pending', 'active'].includes(s.status) && <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => cancel(s)}>{s.status === 'pending' ? 'Cancel' : 'Close now'}</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={list.page} pages={list.pages} total={list.total} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      )}

      {stats && (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="glass-card overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Type · 90 days</th><th className="text-right">Closed</th><th className="text-right">In profit</th><th className="text-right">Avg</th><th className="text-right">Total</th></tr></thead>
              <tbody>{Object.entries(stats.last90.byKind).map(([k, v]) => <tr key={k}><td>{KIND[k]}</td><td className="text-right font-mono">{v.n}</td><td className="text-right font-mono">{Math.round(v.winRate * 100)}%</td><td className="text-right font-mono">{r(v.avgR)}</td><td className="text-right font-mono">{r(v.totalR)}</td></tr>)}
                {!Object.keys(stats.last90.byKind).length && <tr><td colSpan={5} className="text-base-content/50">No closed signals yet.</td></tr>}</tbody>
            </table>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Staff · 90 days</th><th className="text-right">Closed</th><th className="text-right">In profit</th><th className="text-right">Total</th></tr></thead>
              <tbody>{stats.staff.map((s) => <tr key={s._id}><td>{s.name}</td><td className="text-right font-mono">{s.n}</td><td className="text-right font-mono">{Math.round((s.wins / s.n) * 100)}%</td><td className="text-right font-mono">{r(s.totalR)}</td></tr>)}
                {!stats.staff.length && <tr><td colSpan={4} className="text-base-content/50">No closed staff signals yet.</td></tr>}</tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Settings</h2>
      <Settings onSaved={setConfig} />
    </>
  );
}
