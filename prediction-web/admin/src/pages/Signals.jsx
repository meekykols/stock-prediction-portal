import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Play, Radio, Save, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { signalsApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate, formatDateTime, fullName } from '../utils/format';

const JOBS = { 'stock-signals': 'Stock signals', 'sports-signals': 'Sports signals' };
const RUN_BADGE = { running: 'badge-info', success: 'badge-success', partial: 'badge-warning', failed: 'badge-error', skipped: 'badge-ghost' };
const duration = (r) => (r.finishedAt ? `${Math.max(1, Math.round((new Date(r.finishedAt) - new Date(r.startedAt)) / 1000))}s` : '…');

function TickerInput({ value, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.toUpperCase().split(/[\s,]+/).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-field border border-base-content/20 p-2">
      {value.map((t) => (
        <span key={t} className="badge badge-primary badge-soft gap-1 font-mono">
          {t}<button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="size-3" /></button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={add}
        onKeyDown={(e) => { if (['Enter', ',', ' '].includes(e.key)) { e.preventDefault(); add(); } }}
        placeholder={value.length ? 'Add ticker…' : 'e.g. AAPL, MTNN.LG'} className="min-w-28 flex-1 bg-transparent font-mono text-sm outline-none" aria-label="Add ticker" />
    </div>
  );
}

export default function Signals() {
  useDocumentTitle('Signals');
  const [config, setConfig] = useState(null);
  const [runs, setRuns] = useState({ items: [], running: [] });
  const [feed, setFeed] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadRuns = useCallback(() => signalsApi.runs().then(setRuns).catch(() => {}), []);
  const loadFeed = useCallback((date) => signalsApi.list({ date }).then(setFeed).catch(() => {}), []);
  useEffect(() => { signalsApi.config().then(setConfig).catch((e) => toast.error(errorMessage(e))); loadRuns(); loadFeed(); }, [loadRuns, loadFeed]);

  // Poll while a run is in progress, then refresh the published list.
  useEffect(() => {
    if (!runs.running.length) return undefined;
    const t = setInterval(async () => {
      const next = await signalsApi.runs().catch(() => null);
      if (!next) return;
      setRuns(next);
      if (!next.running.length) { loadFeed(); toast.success('Run finished'); }
    }, 3000);
    return () => clearInterval(t);
  }, [runs.running.length, loadFeed]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await signalsApi.saveConfig({ enabled: config.enabled, stocks: config.stocks, sports: config.sports });
      setConfig(res.data);
      toast.success(res.message);
    } catch (e) {
      const f = fieldErrors(e);
      toast.error(Object.values(f)[0] || errorMessage(e));
    } finally { setSaving(false); }
  };
  const run = async (job) => {
    try { await signalsApi.run(job); toast.success(`${JOBS[job]} started`); loadRuns(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const setGroup = (g, patch) => setConfig((c) => ({ ...c, [g]: { ...c[g], ...patch } }));

  return (
    <>
      <PageHeader title="Signals" subtitle="Scheduled model runs published to the Pro/Elite signals feed. Times are UTC." />
      {!config ? <div className="skeleton h-64 rounded-box" /> : (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Stock signals</h2>
              <label className="label cursor-pointer gap-2 text-sm"><input type="checkbox" className="toggle toggle-primary toggle-sm" checked={config.stocks.enabled} onChange={(e) => setGroup('stocks', { enabled: e.target.checked })} /> On</label>
            </div>
            <p className="mt-1 text-xs text-base-content/60">Runs weekdays at 21:30 UTC, after the US market close.</p>
            <p className="mb-2 mt-4 text-sm font-medium">Watchlist ({config.stocks.tickers.length})</p>
            <TickerInput value={config.stocks.tickers} onChange={(tickers) => setGroup('stocks', { tickers })} />
            <label className="mt-4 flex items-center gap-3 text-sm">Outlook
              <select className="select select-sm w-auto" value={config.stocks.horizon} onChange={(e) => setGroup('stocks', { horizon: Number(e.target.value) })}>
                {[1, 3, 5, 7, 14].map((h) => <option key={h} value={h}>{h} day{h > 1 ? 's' : ''}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-sm btn-ghost mt-4 border-base-content/10" onClick={() => run('stock-signals')} disabled={runs.running.includes('stock-signals')}>
              {runs.running.includes('stock-signals') ? <span className="loading loading-spinner loading-xs" /> : <Play className="size-4" />} Run now
            </button>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Sports signals</h2>
              <label className="label cursor-pointer gap-2 text-sm"><input type="checkbox" className="toggle toggle-primary toggle-sm" checked={config.sports.enabled} onChange={(e) => setGroup('sports', { enabled: e.target.checked })} /> On</label>
            </div>
            <p className="mt-1 text-xs text-base-content/60">Runs daily at 06:00 UTC on today&apos;s upcoming fixtures in the tracked leagues.</p>
            <label className="mt-4 flex items-center gap-3 text-sm">Matches per run
              <input type="number" min={1} max={30} className="input input-sm w-24" value={config.sports.maxPerRun} onChange={(e) => setGroup('sports', { maxPerRun: Number(e.target.value) })} />
            </label>
            <p className="mt-2 text-xs text-base-content/50">Each match uses about 3 API-Football requests (cached), so 8 matches fit easily in the free tier&apos;s 100/day.</p>
            <button type="button" className="btn btn-sm btn-ghost mt-4 border-base-content/10" onClick={() => run('sports-signals')} disabled={runs.running.includes('sports-signals')}>
              {runs.running.includes('sports-signals') ? <span className="loading loading-spinner loading-xs" /> : <Play className="size-4" />} Run now
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 xl:col-span-2">
            <label className="label cursor-pointer gap-3 text-sm"><input type="checkbox" className="toggle toggle-success" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} /> Scheduled runs enabled</label>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-4" />} Save settings</button>
          </div>
        </div>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Recent runs</h2>
      {runs.items.length === 0 ? <p className="text-sm text-base-content/60">No runs yet.</p> : (
        <div className="glass-card overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>Started</th><th>Job</th><th>Trigger</th><th>Status</th><th className="text-right">Published</th><th className="text-right">Failed</th><th>Took</th><th>Notes</th></tr></thead>
            <tbody>
              {runs.items.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{formatDateTime(r.startedAt)}</td>
                  <td>{JOBS[r.job]}</td>
                  <td className="whitespace-nowrap text-xs">{r.trigger === 'manual' ? `Manual · ${fullName(r.triggeredBy)}` : 'Schedule'}</td>
                  <td><span className={`badge badge-soft badge-sm ${RUN_BADGE[r.status]}`}>{r.status}</span></td>
                  <td className="text-right font-mono">{r.created}</td>
                  <td className="text-right font-mono">{r.failed}</td>
                  <td className="font-mono text-xs">{duration(r)}</td>
                  <td className="max-w-72 text-xs text-base-content/60">
                    {r.note}
                    {r.errors?.length > 0 && <details><summary className="cursor-pointer">{r.errors.length} error(s)</summary><ul className="mt-1 list-disc pl-4">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul></details>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-3 mt-10 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Published signals</h2>
        {feed?.dates?.length > 0 && (
          <select className="select select-sm w-auto" value={feed.date} onChange={(e) => loadFeed(e.target.value)} aria-label="Run date">
            {feed.dates.map((d) => <option key={d} value={d}>{formatDate(d)}</option>)}
          </select>
        )}
      </div>
      {!feed?.items?.length ? <div className="glass-card flex items-center gap-3 p-6 text-sm text-base-content/60"><Radio className="size-5" /> Nothing published yet.</div> : (
        <div className="glass-card overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>Type</th><th>Signal</th><th>Outlook</th><th className="text-right">Strength</th></tr></thead>
            <tbody>
              {feed.items.map((s) => (
                <tr key={s.id}>
                  <td className="capitalize">{s.type}</td>
                  <td><p className="font-medium">{s.title}</p><p className="text-xs text-base-content/50">{s.subtitle}</p></td>
                  <td className="text-sm">
                    {s.type === 'stock'
                      ? <span className={s.summary.direction === 'up' ? 'text-success' : 'text-error'}>{s.summary.changePct > 0 ? '+' : ''}{s.summary.changePct}% → {s.summary.targetPrice} {s.summary.currency}</span>
                      : <span>{{ home: s.summary.home, draw: 'Draw', away: s.summary.away }[s.summary.pick?.outcome]} ({Math.round(s.summary.pick?.probability * 100)}%)</span>}
                  </td>
                  <td className="text-right font-mono">{s.type === 'stock' ? `${s.strength.toFixed(2)}%` : `${s.strength}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
