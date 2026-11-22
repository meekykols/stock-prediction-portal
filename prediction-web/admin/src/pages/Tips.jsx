import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Flame, Play, RefreshCw, Save, Search, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { tipsApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime, fullName } from '../utils/format';

const SPORTS = {
  football: 'Football',
  basketball: 'Basketball',
  'american-football': 'American football',
  volleyball: 'Volleyball',
  mma: 'MMA',
};
const JOBS = { 'sports-tips': 'Generate tips', 'tips-settle': 'Settle results' };
const RUN_BADGE = { running: 'badge-info', success: 'badge-success', partial: 'badge-warning', failed: 'badge-error', skipped: 'badge-ghost' };
const RESULT_BADGE = { pending: 'badge-ghost', won: 'badge-success', lost: 'badge-error', void: 'badge-warning' };
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const pickText = (t) => {
  const o = t.prediction?.pick?.outcome;
  return o === 'draw' ? 'Draw' : `${t[o]?.name ?? o} win`;
};

function LeaguePicker({ sport, value, onChange, catalog }) {
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map((catalog || []).map((l) => [l.id, l])), [catalog]);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || !catalog) return [];
    if (/^\d+$/.test(s)) return catalog.filter((l) => String(l.id) === s).slice(0, 8);
    return catalog.filter((l) => !value.includes(l.id) && `${l.name} ${l.country}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, catalog, value]);
  const addId = (id) => { onChange([...new Set([...value, id])]); setQ(''); };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((id) => {
          const l = byId.get(id);
          return (
            <span key={id} className="badge badge-primary badge-soft gap-1" title={`id ${id}`}>
              {l ? `${l.name}${l.country ? ` · ${l.country}` : ''}` : `#${id}`}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label={`Remove ${l?.name ?? id}`}><X className="size-3" /></button>
            </span>
          );
        })}
        {!value.length && <span className="text-xs text-warning">No leagues: nothing will be tipped for {SPORTS[sport]}.</span>}
      </div>
      <div className="relative mt-2">
        <label className="input input-sm w-full">
          <Search className="size-4 opacity-50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={catalog ? 'Add a league: search by name, country or id' : 'Add a league by id'}
            onKeyDown={(e) => { if (e.key === 'Enter' && /^\d+$/.test(q.trim())) { e.preventDefault(); addId(Number(q.trim())); } }} />
        </label>
        {matches.length > 0 && (
          <ul className="menu absolute z-20 mt-1 w-full rounded-box border border-base-content/10 bg-base-100 p-1 shadow-lg">
            {matches.map((l) => (
              <li key={l.id}><button type="button" onClick={() => addId(l.id)}>
                {l.logo && <img src={l.logo} alt="" className="size-4 object-contain" />}{l.name}<span className="text-xs text-base-content/50">{l.country} · {l.id}</span>
              </button></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Settings({ onSaved }) {
  const [config, setConfig] = useState(null);
  const [plans, setPlans] = useState([]);
  const [catalogs, setCatalogs] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    tipsApi.config().then((d) => { setConfig(d.config); setPlans(d.plans); }).catch((e) => toast.error(errorMessage(e)));
    for (const s of Object.keys(SPORTS).filter((x) => x !== 'mma')) {
      tipsApi.leagues(s).then((d) => setCatalogs((c) => ({ ...c, [s]: d.leagues }))).catch(() => {});
    }
  }, []);

  if (!config) return <div className="skeleton h-72 rounded-box" />;
  const setSport = (s, patch) => setConfig((c) => ({ ...c, sports: { ...c.sports, [s]: { ...c.sports[s], ...patch } } }));
  const togglePlan = (slug) => setConfig((c) => ({
    ...c, fullAccessPlans: c.fullAccessPlans.includes(slug) ? c.fullAccessPlans.filter((x) => x !== slug) : [...c.fullAccessPlans, slug],
  }));

  const save = async () => {
    setSaving(true);
    try {
      const { enabled, sports, fullAccessPlans, previewCount, featuredConfidence, odds } = config;
      const res = await tipsApi.saveConfig({ enabled, sports, fullAccessPlans, previewCount, featuredConfidence, odds });
      setConfig(res.data);
      toast.success(res.message);
      onSaved?.();
    } catch (e) {
      toast.error(Object.values(fieldErrors(e))[0] || errorMessage(e));
    } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="glass-card divide-y divide-base-content/10">
        {Object.entries(SPORTS).map(([s, label]) => (
          <div key={s} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{label}</h3>
              <label className="label cursor-pointer gap-2 text-sm">
                <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={config.sports[s].enabled} onChange={(e) => setSport(s, { enabled: e.target.checked })} /> On
              </label>
            </div>
            {s === 'mma'
              ? <p className="mt-2 text-xs text-base-content/60">MMA has no leagues: every fight the data provider lists for the day is tipped.</p>
              : config.sports[s].enabled && <div className="mt-3"><LeaguePicker sport={s} value={config.sports[s].leagues} catalog={catalogs[s]} onChange={(leagues) => setSport(s, { leagues })} /></div>}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="glass-card space-y-4 p-5">
          <h3 className="font-semibold">Who sees every tip</h3>
          <p className="text-xs text-base-content/60">Plans switched on see all tips before kick-off. Everyone else, including visitors who aren&apos;t signed in, sees the free preview. Finished matches are always visible.</p>
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.slug}>
                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  {p.name}
                  <input type="checkbox" className="toggle toggle-sm toggle-success" checked={config.fullAccessPlans.includes(p.slug)} onChange={() => togglePlan(p.slug)} />
                </label>
              </li>
            ))}
          </ul>
          <label className="flex items-center justify-between gap-3 text-sm">Free preview per sport per day
            <input type="number" min={0} max={50} className="input input-sm w-20" value={config.previewCount} onChange={(e) => setConfig({ ...config, previewCount: Number(e.target.value) })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">Mark as Top tip from
            <select className="select select-sm w-auto" value={config.featuredConfidence} onChange={(e) => setConfig({ ...config, featuredConfidence: e.target.value })}>
              <option value="high">High confidence</option>
              <option value="medium">Medium confidence</option>
            </select>
          </label>
        </div>
        <div className="glass-card space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Bookmaker odds</h3>
            <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={config.odds?.enabled ?? true} onChange={(e) => setConfig({ ...config, odds: { ...config.odds, enabled: e.target.checked } })} aria-label="Use bookmaker odds" />
          </div>
          <p className="text-xs text-base-content/60">Odds are combined with the model, or used alone when the model has no data for a competition.</p>
          <label className="block text-sm">Bookmakers&apos; share of each tip: <span className="font-mono">{Math.round((config.odds?.marketWeight ?? 0.6) * 100)}%</span>
            <input type="range" min={0} max={1} step={0.1} className="range range-xs range-primary mt-1" value={config.odds?.marketWeight ?? 0.6} onChange={(e) => setConfig({ ...config, odds: { ...config.odds, marketWeight: Number(e.target.value) } })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">Value when model beats odds by
            <span className="flex items-center gap-1"><input type="number" min={1} max={50} className="input input-sm w-16" value={Math.round((config.odds?.valueEdge ?? 0.05) * 100)} onChange={(e) => setConfig({ ...config, odds: { ...config.odds, valueEdge: Number(e.target.value) / 100 } })} />%</span>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">Odds requests per sport per day
            <input type="number" min={0} max={1000} className="input input-sm w-20" value={config.odds?.maxCallsPerRun ?? 40} onChange={(e) => setConfig({ ...config, odds: { ...config.odds, maxCallsPerRun: Number(e.target.value) } })} />
          </label>
          <p className="text-xs text-base-content/50">Each match costs one request. Free API plans allow 100 a day per sport, shared with fixtures and results.</p>
        </div>
        <div className="glass-card flex flex-col gap-3 p-5">
          <label className="label cursor-pointer justify-between text-sm">Scheduled runs enabled
            <input type="checkbox" className="toggle toggle-success" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
          </label>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-4" />} Save settings</button>
        </div>
      </div>
    </div>
  );
}

function Runs({ runs }) {
  if (!runs.items.length) return <p className="text-sm text-base-content/60">No runs yet.</p>;
  return (
    <div className="glass-card overflow-x-auto">
      <table className="table table-sm">
        <thead><tr><th>Started</th><th>Job</th><th>Trigger</th><th>Status</th><th className="text-right">Done</th><th className="text-right">Missed</th><th>Notes</th></tr></thead>
        <tbody>
          {runs.items.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap">{formatDateTime(r.startedAt)}</td>
              <td className="whitespace-nowrap">{JOBS[r.job]}</td>
              <td className="whitespace-nowrap text-xs">{r.trigger === 'manual' ? `Manual · ${fullName(r.triggeredBy)}` : 'Schedule'}</td>
              <td><span className={`badge badge-soft badge-sm ${RUN_BADGE[r.status]}`}>{r.status}</span></td>
              <td className="text-right font-mono">{r.created}</td>
              <td className="text-right font-mono">{r.failed}</td>
              <td className="max-w-96 text-xs text-base-content/60">
                {r.note}
                {r.errors?.length > 0 && <details><summary className="cursor-pointer">{r.errors.length} issue(s)</summary><ul className="mt-1 list-disc pl-4">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul></details>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OddsReport() {
  const [report, setReport] = useState(null);
  useEffect(() => { tipsApi.oddsReport().then(setReport).catch(() => {}); }, []);
  const rows = Object.entries(report?.sports || {});
  return (
    <div className="mt-6">
      <h2 className="mb-1 font-semibold">Model vs bookmakers</h2>
      <p className="mb-3 text-xs text-base-content/60">
        Settled tips from the last {report?.days ?? 90} days that had both views. &quot;Best share&quot; is the bookmakers&apos; share that would have scored best (lowest log loss).
        Wait for at least {report?.minimumToTrust ?? 300} matches before changing the setting.
      </p>
      {!rows.length ? <div className="glass-card p-5 text-sm text-base-content/60">No settled tips with both a model and bookmaker view yet.</div> : (
        <div className="glass-card overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>Sport</th><th className="text-right">Matches</th><th className="text-right">Model right</th><th className="text-right">Bookmakers right</th><th className="text-right">Best share</th></tr></thead>
            <tbody>{rows.map(([s, r]) => (
              <tr key={s}>
                <td>{SPORTS[s]}</td><td className="text-right font-mono">{r.n}</td>
                <td className="text-right font-mono">{pct(r.modelAccuracy)}</td><td className="text-right font-mono">{pct(r.marketAccuracy)}</td>
                <td className="text-right font-mono">{r.bestWeight == null ? '—' : `${Math.round(r.bestWeight * 100)}%`}{r.n < (report.minimumToTrust ?? 300) && <span className="ml-1 text-xs text-warning">(too few)</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Tips() {
  useDocumentTitle('Sports tips');
  const [runs, setRuns] = useState({ items: [], running: [] });
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ sport: '', date: '', state: '', page: 1 });
  const [list, setList] = useState(null);

  const loadRuns = useCallback(() => tipsApi.runs().then(setRuns).catch(() => {}), []);
  const loadStats = useCallback(() => tipsApi.stats().then(setStats).catch(() => {}), []);
  const loadList = useCallback(() => tipsApi.list(filters).then(setList).catch((e) => toast.error(errorMessage(e))), [filters]);
  useEffect(() => { loadRuns(); loadStats(); }, [loadRuns, loadStats]);
  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (!runs.running.length) return undefined;
    const t = setInterval(async () => {
      const next = await tipsApi.runs().catch(() => null);
      if (!next) return;
      setRuns(next);
      if (!next.running.length) { loadList(); loadStats(); toast.success('Run finished'); }
    }, 3000);
    return () => clearInterval(t);
  }, [runs.running.length, loadList, loadStats]);

  const run = async (job) => {
    try { await tipsApi.run(job); toast.success(`${JOBS[job]} started`); loadRuns(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const setResult = async (tip, state) => {
    if (!state) return;
    try {
      const res = await tipsApi.setResult(tip.id, { state });
      toast.success(res.message);
      loadList(); loadStats();
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <>
      <PageHeader
        title="Sports tips"
        subtitle="Daily model tips for the public tips page. Generated at 05:00 and 15:00 UTC, settled hourly."
        actions={(
          <div className="flex gap-2">
            {Object.entries(JOBS).map(([job, label]) => (
              <button key={job} type="button" className="btn btn-sm btn-ghost border-base-content/10" onClick={() => run(job)} disabled={runs.running.includes(job)}>
                {runs.running.includes(job) ? <span className="loading loading-spinner loading-xs" /> : job === 'sports-tips' ? <Play className="size-4" /> : <RefreshCw className="size-4" />} {label}
              </button>
            ))}
          </div>
        )}
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(SPORTS).map(([s, label]) => {
          const d = stats?.last30?.[s];
          return (
            <div key={s} className="glass-card p-4">
              <p className="text-xs text-base-content/60">{label} · 30 days</p>
              <p className="mt-1 font-display text-2xl font-semibold">{pct(d?.hitRate)}</p>
              <p className="text-xs text-base-content/50">{d ? `${d.won}/${d.settled} correct · top tips ${pct(d.featuredHitRate)}` : 'No settled tips yet'}</p>
              {d?.staked > 0 && <p className={`text-xs ${d.roi >= 0 ? 'text-success' : 'text-error'}`}>{d.roi >= 0 ? '+' : ''}{(d.roi * 100).toFixed(1)}% at odds ({d.staked}){d.valueStaked ? ` · value ${d.valueRoi >= 0 ? '+' : ''}${(d.valueRoi * 100).toFixed(1)}% (${d.valueStaked})` : ''}</p>}
            </div>
          );
        })}
      </div>

      <Settings onSaved={loadRuns} />
      <OddsReport />

      <h2 className="mb-3 mt-10 font-semibold">Recent runs</h2>
      <Runs runs={runs} />

      <div className="mb-3 mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-semibold">Published tips</h2>
        <div className="flex flex-wrap gap-2">
          <select className="select select-sm w-auto" value={filters.sport} onChange={(e) => setFilter({ sport: e.target.value })} aria-label="Sport">
            <option value="">All sports</option>
            {Object.entries(SPORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="date" className="input input-sm w-auto" value={filters.date} onChange={(e) => setFilter({ date: e.target.value })} aria-label="Date (UTC)" />
          <select className="select select-sm w-auto" value={filters.state} onChange={(e) => setFilter({ state: e.target.value })} aria-label="Result">
            <option value="">Any result</option>
            {['pending', 'won', 'lost', 'void'].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      {!list ? <div className="skeleton h-48 rounded-box" /> : !list.items.length ? (
        <div className="glass-card flex items-center gap-3 p-6 text-sm text-base-content/60"><Flame className="size-5" /> No tips match these filters.</div>
      ) : (
        <>
          <div className="glass-card overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Start</th><th>Sport</th><th>Match</th><th>Tip</th><th className="text-right">Chance</th><th>Confidence</th><th>Result</th><th /></tr></thead>
              <tbody>
                {list.items.map((t) => {
                  const started = new Date(t.kickoff) <= new Date();
                  return (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap text-xs">{formatDateTime(t.kickoff)}</td>
                      <td className="whitespace-nowrap text-xs">{SPORTS[t.sport]}</td>
                      <td><p className="font-medium">{t.home?.name} v {t.away?.name}</p><p className="text-xs text-base-content/50">{t.league?.name}</p></td>
                      <td className="whitespace-nowrap">
                        {t.featured && <Flame className="mr-1 inline size-3.5 text-primary" />}{pickText(t)}
                        {t.prediction?.pick?.odds && <span className="ml-1 font-mono text-xs text-base-content/50">@{t.prediction.pick.odds}</span>}
                        {t.prediction?.source === 'market' && <span className="badge badge-xs badge-ghost ml-1">bookmakers</span>}
                        {t.prediction?.value && <span className="badge badge-xs badge-accent badge-soft ml-1">value</span>}
                        {t.prediction?.predictedScore && <span className="ml-1 font-mono text-xs text-base-content/50">{t.prediction.predictedScore.home}–{t.prediction.predictedScore.away}</span>}
                      </td>
                      <td className="text-right font-mono">{pct(t.prediction?.pick?.probability)}</td>
                      <td><span className="badge badge-sm badge-ghost">{t.prediction?.confidence}</span></td>
                      <td className="whitespace-nowrap">
                        <span className={`badge badge-sm badge-soft ${RESULT_BADGE[t.result?.state]}`} title={t.result?.note}>{t.result?.state}</span>
                        {t.result?.score && <span className="ml-1 font-mono text-xs">{t.result.score.home}–{t.result.score.away}</span>}
                      </td>
                      <td>
                        {started && (
                          <select className="select select-xs w-auto" value="" onChange={(e) => setResult(t, e.target.value)} aria-label="Correct the result">
                            <option value="">Correct…</option>
                            <option value="won">Mark won</option>
                            <option value="lost">Mark lost</option>
                            <option value="void">Mark void</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={list.page} pages={list.pages} total={list.total} onPage={(page) => setFilter({ page })} />
        </>
      )}
    </>
  );
}
