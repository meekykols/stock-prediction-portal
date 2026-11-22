import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Save, Search, Ticket, Trash2, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { codesApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime, fullName } from '../utils/format';

const MARKETS = {
  '1x2': { label: '1X2', outcomes: { home: 'Home', draw: 'Draw', away: 'Away' }, football: true },
  winner: { label: 'Winner', outcomes: { home: 'Home', away: 'Away' } },
  dc: { label: 'Double chance', outcomes: { '1X': '1X', X2: 'X2', 12: '12' }, football: true },
  total: { label: 'Over/under', outcomes: { over: 'Over', under: 'Under' } },
  btts: { label: 'Both teams score', outcomes: { yes: 'Yes', no: 'No' }, football: true },
};
const RESULT_BADGE = { pending: 'badge-ghost', won: 'badge-success', lost: 'badge-error', void: 'badge-warning' };
const pct = (won, n) => (n ? `${Math.round((won / n) * 100)}%` : '—');
const toLocalInput = (d) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

function marketsFor(sport) {
  return Object.entries(MARKETS).filter(([, m]) => !sport || sport === 'football' || !m.football);
}

function fromTip(t) {
  const football = t.sport === 'football';
  const total = t.prediction?.markets?.find((m) => m.key === 'total');
  return {
    tipId: t.id, sport: t.sport, label: `${t.home.name} v ${t.away.name}`, league: t.league?.name, kickoff: t.kickoff,
    market: football ? '1x2' : 'winner', outcome: t.prediction?.pick?.outcome ?? 'home', line: total?.line ?? 2.5,
  };
}

function SelectionEditor({ sel, onChange, onRemove }) {
  const market = MARKETS[sel.market];
  return (
    <li className="grid gap-2 rounded-box border border-base-content/10 p-3 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        {sel.tipId ? (
          <>
            <p className="truncate text-sm font-medium">{sel.label}</p>
            <p className="truncate text-xs text-base-content/50">{[sel.league, sel.kickoff && formatDateTime(sel.kickoff)].filter(Boolean).join(' · ')} · settles automatically</p>
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
            <input className="input input-sm" placeholder="Match, e.g. Kano Pillars v Enyimba" value={sel.label} onChange={(e) => onChange({ label: e.target.value })} aria-label="Match" />
            <input type="datetime-local" className="input input-sm" value={toLocalInput(sel.kickoff)} onChange={(e) => onChange({ kickoff: e.target.value ? new Date(e.target.value).toISOString() : '' })} aria-label="Kick-off" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="select select-sm w-auto" value={sel.market} aria-label="Market"
          onChange={(e) => onChange({ market: e.target.value, outcome: Object.keys(MARKETS[e.target.value].outcomes)[0] })}>
          {marketsFor(sel.sport).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <select className="select select-sm w-auto" value={sel.outcome} onChange={(e) => onChange({ outcome: e.target.value })} aria-label="Pick">
          {Object.entries(market.outcomes).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {sel.market === 'total' && <input type="number" step="1" min="0.5" className="input input-sm w-20" value={sel.line} onChange={(e) => onChange({ line: e.target.value })} aria-label="Line" />}
        <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onRemove} aria-label="Remove selection"><X className="size-4" /></button>
      </div>
    </li>
  );
}

function CodeModal({ open, code, platforms, onClose, onSaved }) {
  const isNew = !code?.id;
  const [form, setForm] = useState(null);
  const [q, setQ] = useState('');
  const [options, setOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setQ('');
    setForm(code?.id ? {
      platform: code.platform, code: code.code, odds: code.odds ?? '', note: code.note ?? '', expiresAt: code.expiresAt,
      selections: code.selections.map((s) => ({ tipId: s.tip, sport: s.sport, label: s.label, league: s.league, kickoff: s.kickoff, market: s.market, outcome: s.outcome, line: s.line ?? 2.5 })),
    } : { platform: platforms[0]?.slug ?? '', code: '', odds: '', note: '', expiresAt: '', selections: [] });
  }, [open, code, platforms]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => codesApi.tipOptions({ q: q.trim() || undefined }).then(setOptions).catch(() => setOptions([])), 250);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!form) return null;
  const chosen = new Set(form.selections.map((s) => s.tipId).filter(Boolean));
  const needsExpiry = !form.selections.some((s) => s.kickoff);
  const setSel = (i, patch) => setForm((f) => ({ ...f, selections: f.selections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    const body = {
      platform: form.platform, code: form.code.trim(), odds: form.odds === '' ? null : Number(form.odds), note: form.note || null,
      expiresAt: needsExpiry ? form.expiresAt || undefined : undefined,
      selections: form.selections.map((s) => ({
        ...(s.tipId ? { tipId: s.tipId } : { label: s.label, kickoff: s.kickoff || undefined }),
        market: s.market, outcome: s.outcome, ...(s.market === 'total' && { line: Number(s.line) }),
      })),
    };
    try {
      const res = isNew ? await codesApi.create(body) : await codesApi.update(code.id, body);
      toast.success(res.message);
      onSaved();
      onClose();
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      toast.error(Object.values(f)[0] || errorMessage(e));
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'Post a booking code' : `Edit ${code.code}`} size="max-w-3xl"
      actions={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-4" />}{isNew ? 'Post code' : 'Save'}</button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="form-control"><span className="label-text mb-1 text-sm">Platform</span>
          <select className="select select-sm w-full" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
            {platforms.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </label>
        <label className="form-control"><span className="label-text mb-1 text-sm">Booking code</span>
          <input className={`input input-sm w-full font-mono uppercase ${errors.code ? 'input-error' : ''}`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. 3F7K9Q" />
          {errors.code && <span className="mt-1 text-xs text-error">{errors.code}</span>}
        </label>
        <label className="form-control"><span className="label-text mb-1 text-sm">Total odds</span>
          <input type="number" step="0.01" min="1.01" className={`input input-sm w-full ${errors.odds ? 'input-error' : ''}`} value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} placeholder="e.g. 5.40" />
        </label>
      </div>
      <label className="form-control mt-3"><span className="label-text mb-1 text-sm">Note for customers (optional)</span>
        <input className="input input-sm w-full" maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Safe weekend double" />
      </label>

      <h4 className="mb-2 mt-5 text-sm font-semibold">Selections ({form.selections.length})</h4>
      {form.selections.length > 0 && (
        <ul className="space-y-2">{form.selections.map((s, i) => (
          <SelectionEditor key={s.tipId || `m${i}`} sel={s} onChange={(p) => setSel(i, p)} onRemove={() => setForm((f) => ({ ...f, selections: f.selections.filter((_, j) => j !== i) }))} />
        ))}</ul>
      )}

      <div className="mt-3 rounded-box bg-base-content/5 p-3">
        <label className="input input-sm w-full"><Search className="size-4 opacity-50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a match from today's tips: search team or league" />
        </label>
        <ul className="mt-2 max-h-48 overflow-y-auto">
          {options.filter((t) => !chosen.has(t.id)).map((t) => (
            <li key={t.id}>
              <button type="button" className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-base-content/10"
                onClick={() => setForm((f) => ({ ...f, selections: [...f.selections, fromTip(t)] }))}>
                <span className="truncate">{t.home.name} v {t.away.name}<span className="ml-2 text-xs text-base-content/50">{t.league?.name}</span></span>
                <span className="shrink-0 text-xs text-base-content/50">{formatDateTime(t.kickoff)}</span>
              </button>
            </li>
          ))}
          {!options.length && <li className="px-2 py-1.5 text-xs text-base-content/50">No upcoming tips match. Add the match by hand instead.</li>}
        </ul>
        <button type="button" className="btn btn-ghost btn-xs mt-2" onClick={() => setForm((f) => ({ ...f, selections: [...f.selections, { label: '', kickoff: '', market: '1x2', outcome: 'home', line: 2.5 }] }))}>
          <Plus className="size-3.5" />Add a match by hand (settled by staff)
        </button>
      </div>

      {needsExpiry && (
        <label className="form-control mt-4"><span className="label-text mb-1 text-sm">Code expires at</span>
          <input type="datetime-local" className={`input input-sm w-full sm:w-64 ${errors.expiresAt ? 'input-error' : ''}`} value={toLocalInput(form.expiresAt)} onChange={(e) => setForm({ ...form, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
          <span className="mt-1 text-xs text-base-content/50">{errors.expiresAt || 'Needed because no selection has a kick-off time. Otherwise the code expires at the first kick-off.'}</span>
        </label>
      )}
    </Modal>
  );
}

function Settings({ onSaved }) {
  const [config, setConfig] = useState(null);
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { codesApi.config().then((d) => { setConfig(d.config); setPlans(d.plans); }).catch((e) => toast.error(errorMessage(e))); }, []);
  if (!config) return <div className="skeleton h-60 rounded-box" />;

  const setPlatform = (i, patch) => setConfig((c) => ({ ...c, platforms: c.platforms.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const togglePlan = (slug) => setConfig((c) => ({ ...c, visiblePlans: c.visiblePlans.includes(slug) ? c.visiblePlans.filter((x) => x !== slug) : [...c.visiblePlans, slug] }));
  const save = async () => {
    setSaving(true);
    try {
      const res = await codesApi.saveConfig({ enabled: config.enabled, visiblePlans: config.visiblePlans, platforms: config.platforms });
      setConfig(res.data);
      toast.success(res.message);
      onSaved();
    } catch (e) {
      toast.error(Object.values(fieldErrors(e))[0] || errorMessage(e));
    } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <div className="glass-card overflow-x-auto p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Betting platforms</h3>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setConfig((c) => ({ ...c, platforms: [...c.platforms, { slug: '', name: '', website: '', color: '#22d3ee', active: true }] }))}><Plus className="size-3.5" />Add platform</button>
        </div>
        <table className="table table-sm">
          <thead><tr><th>On</th><th>Name</th><th>Website</th><th>Colour</th><th /></tr></thead>
          <tbody>
            {config.platforms.map((p, i) => (
              <tr key={p.slug || `new${i}`}>
                <td><input type="checkbox" className="toggle toggle-xs toggle-success" checked={p.active} onChange={(e) => setPlatform(i, { active: e.target.checked })} aria-label={`${p.name} on`} /></td>
                <td><input className="input input-xs w-32" value={p.name} onChange={(e) => setPlatform(i, { name: e.target.value })} aria-label="Name" /></td>
                <td><input className="input input-xs w-56" value={p.website || ''} onChange={(e) => setPlatform(i, { website: e.target.value })} placeholder="https://" aria-label="Website" /></td>
                <td><input type="color" className="h-6 w-10 cursor-pointer rounded" value={p.color || '#22d3ee'} onChange={(e) => setPlatform(i, { color: e.target.value })} aria-label="Colour" /></td>
                <td><button type="button" className="btn btn-ghost btn-xs btn-square" onClick={() => setConfig((c) => ({ ...c, platforms: c.platforms.filter((_, j) => j !== i) }))} aria-label={`Remove ${p.name}`}><Trash2 className="size-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-base-content/50">Switch a platform off to hide it without losing its past codes.</p>
      </div>
      <div className="glass-card space-y-4 p-5">
        <h3 className="font-semibold">Who sees live codes</h3>
        <p className="text-xs text-base-content/60">Plans switched on see codes before kick-off. Others see a locked card with the odds and number of selections. Codes unlock for everyone once the first match starts.</p>
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.slug}><label className="flex cursor-pointer items-center justify-between text-sm">{p.name}
              <input type="checkbox" className="toggle toggle-sm toggle-success" checked={config.visiblePlans.includes(p.slug)} onChange={() => togglePlan(p.slug)} /></label></li>
          ))}
        </ul>
        <label className="flex cursor-pointer items-center justify-between border-t border-base-content/10 pt-4 text-sm">Booking codes enabled
          <input type="checkbox" className="toggle toggle-success" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
        </label>
        <button type="button" className="btn btn-primary btn-sm w-full" onClick={save} disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-4" />}Save settings</button>
      </div>
    </div>
  );
}

export default function BookingCodes() {
  useDocumentTitle('Booking codes');
  const [platforms, setPlatforms] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ view: 'live', platform: '', result: '', page: 1 });
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const loadPlatforms = useCallback(() => codesApi.config().then((d) => setPlatforms(d.config.platforms)).catch(() => {}), []);
  const loadList = useCallback(() => codesApi.list(filters).then(setList).catch((e) => toast.error(errorMessage(e))), [filters]);
  const loadStats = useCallback(() => codesApi.stats().then(setStats).catch(() => {}), []);
  useEffect(() => { loadPlatforms(); loadStats(); }, [loadPlatforms, loadStats]);
  useEffect(() => { loadList(); }, [loadList]);

  const byPlatform = useMemo(() => new Map(platforms.map((p) => [p.slug, p])), [platforms]);
  const activePlatforms = platforms.filter((p) => p.active);
  const refresh = () => { loadList(); loadStats(); };
  const act = async (fn) => { try { const r = await fn(); toast.success(r.message); refresh(); } catch (e) { toast.error(errorMessage(e)); } };
  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <>
      <PageHeader title="Booking codes" subtitle="Post bookmaker codes for customers. Selections linked to our tips settle automatically."
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})} disabled={!activePlatforms.length}><Plus className="size-4" />Post a code</button>} />

      {stats && (stats.byPlatform.length > 0 || stats.byStaff.length > 0) && (
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          {[['Platform', stats.byPlatform.map((r) => ({ ...r, name: byPlatform.get(r._id)?.name ?? r._id }))], ['Posted by', stats.byStaff]].map(([title, rows]) => (
            <div key={title} className="glass-card overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>{title} · 30 days</th><th className="text-right">Won</th><th className="text-right">Hit rate</th><th className="text-right">Copies</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={String(r._id)}><td>{r.name}</td><td className="text-right font-mono">{r.won}/{r.settled}</td><td className="text-right font-mono">{pct(r.won, r.settled)}</td><td className="text-right font-mono">{r.copies}</td></tr>)}</tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" className="tabs tabs-box">
          {[['live', 'Live'], ['started', 'Started & settled'], ['withdrawn', 'Withdrawn']].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={filters.view === v} className={`tab ${filters.view === v ? 'tab-active' : ''}`} onClick={() => setFilter({ view: v })}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="select select-sm w-auto" value={filters.platform} onChange={(e) => setFilter({ platform: e.target.value })} aria-label="Platform">
            <option value="">All platforms</option>{platforms.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <select className="select select-sm w-auto" value={filters.result} onChange={(e) => setFilter({ result: e.target.value })} aria-label="Result">
            <option value="">Any result</option>{['pending', 'won', 'lost', 'void'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {!list ? <div className="skeleton h-40 rounded-box" /> : !list.items.length ? (
        <div className="glass-card flex items-center gap-3 p-6 text-sm text-base-content/60"><Ticket className="size-5" />No codes here yet.</div>
      ) : (
        <>
          <div className="glass-card overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Platform</th><th>Code</th><th>Selections</th><th className="text-right">Odds</th><th>First kick-off</th><th>Posted by</th><th className="text-right">Copies</th><th>Result</th><th /></tr></thead>
              <tbody>
                {list.items.map((c) => {
                  const started = new Date(c.expiresAt) <= new Date();
                  const p = byPlatform.get(c.platform);
                  return [
                    <tr key={c.id} className="cursor-pointer hover:bg-base-content/5" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                      <td className="whitespace-nowrap"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: p?.color }} />{p?.name ?? c.platform}</td>
                      <td className="font-mono font-semibold">{c.code}</td>
                      <td>{c.selections.length}</td>
                      <td className="text-right font-mono">{c.odds?.toFixed(2) ?? '—'}</td>
                      <td className="whitespace-nowrap text-xs">{formatDateTime(c.expiresAt)}</td>
                      <td className="whitespace-nowrap text-xs">{fullName(c.createdBy)}</td>
                      <td className="text-right font-mono">{c.copies}</td>
                      <td><span className={`badge badge-sm badge-soft ${RESULT_BADGE[c.result.state]}`} title={c.result.note}>{c.result.state}{c.result.manual ? ' · manual' : ''}</span></td>
                      <td className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        {c.status === 'active' && !started && <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(c)}><Pencil className="size-3.5" />Edit</button>}
                        {c.status === 'active' && started && (
                          <select className="select select-xs w-auto" value="" onChange={(e) => e.target.value && act(() => codesApi.setResult(c.id, { state: e.target.value }))} aria-label="Set result">
                            <option value="">Result…</option><option value="won">Won</option><option value="lost">Lost</option><option value="void">Void</option><option value="pending">Back to automatic</option>
                          </select>
                        )}
                        {c.status === 'active' && <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => window.confirm(`Withdraw ${c.code}? Customers will no longer see it.`) && act(() => codesApi.withdraw(c.id))}><Trash2 className="size-3.5" /></button>}
                      </td>
                    </tr>,
                    expanded === c.id && (
                      <tr key={`${c.id}-x`}><td colSpan={9} className="bg-base-content/[0.03]">
                        {c.note && <p className="mb-2 text-xs text-base-content/60">Note: {c.note}</p>}
                        <ul className="space-y-1">
                          {c.selections.map((s, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-3 text-sm">
                              <span className="min-w-48 font-medium">{s.label}</span>
                              <span className="text-xs text-base-content/50">{MARKETS[s.market]?.label}: {MARKETS[s.market]?.outcomes[s.outcome] ?? s.outcome}{s.market === 'total' ? ` ${s.line}` : ''}</span>
                              <span className={`badge badge-xs badge-soft ${RESULT_BADGE[s.result]}`}>{s.result}</span>
                              {!s.tip && started && (
                                <select className="select select-xs w-auto" value="" onChange={(e) => e.target.value && act(() => codesApi.setSelectionResult(c.id, i, e.target.value))} aria-label="Selection result">
                                  <option value="">Set…</option><option value="won">Won</option><option value="lost">Lost</option><option value="void">Void</option><option value="pending">Pending</option>
                                </select>
                              )}
                              {!s.tip && <span className="text-xs text-warning">settled by staff</span>}
                            </li>
                          ))}
                          {!c.selections.length && <li className="text-xs text-base-content/50">No selections listed: set the result by hand after kick-off.</li>}
                        </ul>
                      </td></tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={list.page} pages={list.pages} total={list.total} onPage={(page) => setFilter({ page })} />
        </>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Settings</h2>
      <Settings onSaved={loadPlatforms} />

      <CodeModal open={editing !== null} code={editing} platforms={activePlatforms} onClose={() => setEditing(null)} onSaved={refresh} />
    </>
  );
}
