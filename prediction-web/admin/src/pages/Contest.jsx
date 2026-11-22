import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Award, Crown, Download, Image as ImageIcon, Megaphone, Pencil, Plus, Save, Wallet } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { contestApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate, formatMoney, fullName } from '../utils/format';

const REWARD = { cash: 'Cash prize', elite: 'Free Elite', advert: 'Advert spot' };
const STATUS_BADGE = { pending: 'badge-warning', paid: 'badge-success', granted: 'badge-success', live: 'badge-info', draft: 'badge-ghost', ended: 'badge-ghost' };
const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthsBack = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i);
  return d.toISOString().slice(0, 7);
});
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const toLocalInput = (d) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');

function Settings() {
  const [c, setC] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { contestApi.config().then(setC).catch((e) => toast.error(errorMessage(e))); }, []);
  if (!c) return <div className="skeleton h-48 rounded-box" />;
  const save = async () => {
    setSaving(true);
    try {
      const { enabled, freeUsersCanEnter, minPicks, maxPicks, perfectMultiplier, rulesNote } = c;
      const res = await contestApi.saveConfig({ enabled, freeUsersCanEnter, minPicks, maxPicks, perfectMultiplier, rulesNote });
      setC(res.data); toast.success(res.message);
    } catch (e) { toast.error(Object.values(fieldErrors(e))[0] || errorMessage(e)); } finally { setSaving(false); }
  };
  const num = (k) => (e) => setC({ ...c, [k]: Number(e.target.value) });
  return (
    <div className="glass-card grid gap-5 p-5 lg:grid-cols-[1fr_1fr_auto]">
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">Contest open
          <input type="checkbox" className="toggle toggle-success" checked={c.enabled} onChange={(e) => setC({ ...c, enabled: e.target.checked })} /></label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">Free (Starter) users can enter
          <input type="checkbox" className="toggle toggle-primary" checked={c.freeUsersCanEnter} onChange={(e) => setC({ ...c, freeUsersCanEnter: e.target.checked })} /></label>
        <p className="text-xs text-base-content/50">Paid plans can always enter.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="form-control text-sm"><span className="mb-1">Min picks</span><input type="number" min={1} max={50} className="input input-sm" value={c.minPicks} onChange={num('minPicks')} /></label>
        <label className="form-control text-sm"><span className="mb-1">Max picks</span><input type="number" min={1} max={50} className="input input-sm" value={c.maxPicks} onChange={num('maxPicks')} /></label>
        <label className="form-control text-sm"><span className="mb-1">Perfect ×</span><input type="number" min={1} max={10} step={0.5} className="input input-sm" value={c.perfectMultiplier} onChange={num('perfectMultiplier')} /></label>
        <p className="col-span-3 text-xs text-base-content/50">On quiet days the minimum drops to the number of matches on the day&apos;s list.</p>
      </div>
      <div className="flex items-end"><button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-4" />}Save</button></div>
      <label className="form-control text-sm lg:col-span-3"><span className="mb-1">Extra rules shown to customers (optional)</span>
        <textarea className="textarea textarea-sm w-full" rows={2} maxLength={600} value={c.rulesNote} onChange={(e) => setC({ ...c, rulesNote: e.target.value })} placeholder="e.g. Winners are contacted by email within 3 days of month end." /></label>
    </div>
  );
}

function AwardModal({ target, month, onClose, onDone }) {
  const [type, setType] = useState('elite');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState(30);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (target) { setType('elite'); setAmount(''); setDays(30); setNote(''); } }, [target]);
  if (!target) return null;
  const save = async () => {
    setSaving(true);
    try {
      const res = await contestApi.award(month, { userId: target.userId, type, note: note || undefined, ...(type === 'cash' && { amount: Number(amount) }), ...(type === 'elite' && { days }) });
      toast.success(res.message);
      onDone(); onClose();
    } catch (e) { toast.error(Object.values(fieldErrors(e))[0] || errorMessage(e)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Reward ${target.fullName} (#${target.rank}, ${target.points} pts)`}
      actions={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : <Award className="size-4" />}Give reward</button></>}>
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(REWARD).map(([k, l]) => (
          <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-box border p-3 text-sm ${type === k ? 'border-primary bg-primary/10' : 'border-base-content/10'}`}>
            <input type="radio" className="radio radio-primary radio-sm" checked={type === k} onChange={() => setType(k)} />{l}
          </label>
        ))}
      </div>
      <div className="mt-4">
        {type === 'cash' && (
          <label className="form-control text-sm"><span className="mb-1">Amount (₦)</span>
            <input type="number" min={1} className="input input-sm w-48" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" />
            <span className="mt-1 text-xs text-base-content/50">Recorded here; pay it by bank transfer, then mark it paid.</span></label>
        )}
        {type === 'elite' && (
          <label className="form-control text-sm"><span className="mb-1">Days of Elite</span>
            <input type="number" min={1} max={365} className="input input-sm w-32" value={days} onChange={(e) => setDays(Number(e.target.value))} />
            <span className="mt-1 text-xs text-base-content/50">Starts now. Customers paying through Paystack must be cancelled first, or choose another reward.</span></label>
        )}
        {type === 'advert' && <p className="text-sm text-base-content/60">Creates a draft advert below. Add their banner, link and dates, then switch it live.</p>}
      </div>
      <label className="form-control mt-4 text-sm"><span className="mb-1">Note (optional)</span>
        <input className="input input-sm w-full" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    </Modal>
  );
}

function PromoModal({ promo, onClose, onSaved }) {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const file = useRef(null);
  useEffect(() => { if (promo) setF({ ...promo, startsAt: toLocalInput(promo.startsAt), endsAt: toLocalInput(promo.endsAt) }); }, [promo]);
  if (!promo || !f) return null;
  const save = async (status) => {
    setSaving(true);
    try {
      const body = {
        title: f.title, label: f.label, body: f.body || '', imageUrl: f.imageUrl || '', linkUrl: f.linkUrl || '', linkLabel: f.linkLabel || '',
        startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt), status: status ?? f.status,
      };
      const res = await contestApi.savePromo(promo.id, body);
      toast.success(res.message); onSaved(); onClose();
    } catch (e) { toast.error(Object.values(fieldErrors(e))[0] || errorMessage(e)); } finally { setSaving(false); }
  };
  const upload = async (e) => {
    const img = e.target.files?.[0];
    if (!img) return;
    try { const res = await contestApi.uploadPromoImage(promo.id, img); setF((x) => ({ ...x, imageUrl: res.data.imageUrl })); toast.success(res.message); } catch (err) { toast.error(errorMessage(err)); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open onClose={onClose} title="Edit advert" size="max-w-2xl"
      actions={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        {f.status === 'live' && <button type="button" className="btn" onClick={() => save('draft')} disabled={saving}>Take down</button>}
        <button type="button" className="btn" onClick={() => save()} disabled={saving}><Save className="size-4" />Save</button>
        {f.status !== 'live' && <button type="button" className="btn btn-primary" onClick={() => save('live')} disabled={saving}><Megaphone className="size-4" />Approve & go live</button>}
      </>}>
      {promo.owner && <p className="mb-3 text-sm text-base-content/60">Winner: {fullName(promo.owner)} · {promo.owner.email}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="form-control text-sm"><span className="mb-1">Title</span><input className="input input-sm w-full" maxLength={80} value={f.title} onChange={set('title')} /></label>
        <label className="form-control text-sm"><span className="mb-1">Small label</span><input className="input input-sm w-full" maxLength={40} value={f.label || ''} onChange={set('label')} /></label>
        <label className="form-control text-sm sm:col-span-2"><span className="mb-1">Text</span><textarea className="textarea textarea-sm w-full" rows={2} maxLength={240} value={f.body || ''} onChange={set('body')} /></label>
        <label className="form-control text-sm sm:col-span-2"><span className="mb-1">Image</span>
          <div className="flex gap-2">
            <input className="input input-sm flex-1" value={f.imageUrl || ''} onChange={set('imageUrl')} placeholder="https://… or upload" />
            <input ref={file} type="file" accept="image/*" className="hidden" onChange={upload} />
            <button type="button" className="btn btn-sm" onClick={() => file.current?.click()}><ImageIcon className="size-4" />Upload</button>
          </div>
          {f.imageUrl && <img src={f.imageUrl} alt="" className="mt-2 h-24 rounded object-cover" />}
        </label>
        <label className="form-control text-sm"><span className="mb-1">Link</span><input className="input input-sm w-full" value={f.linkUrl || ''} onChange={set('linkUrl')} placeholder="https://" /></label>
        <label className="form-control text-sm"><span className="mb-1">Button text</span><input className="input input-sm w-full" maxLength={30} value={f.linkLabel || ''} onChange={set('linkLabel')} placeholder="Visit" /></label>
        <label className="form-control text-sm"><span className="mb-1">Shows from</span><input type="datetime-local" className="input input-sm w-full" value={f.startsAt} onChange={set('startsAt')} /></label>
        <label className="form-control text-sm"><span className="mb-1">Until</span><input type="datetime-local" className="input input-sm w-full" value={f.endsAt} onChange={set('endsAt')} /></label>
      </div>
      <p className="mt-3 text-xs text-base-content/50">Shown on the home page, tips page and contest page, labelled &quot;Sponsored&quot;. Check the content and link before approving.</p>
    </Modal>
  );
}

export default function Contest() {
  useDocumentTitle('Picks contest');
  const [month, setMonth] = useState(thisMonth());
  const [board, setBoard] = useState(null);
  const [promos, setPromos] = useState([]);
  const [awarding, setAwarding] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [range, setRange] = useState(() => ({ from: `${thisMonth()}-01`, to: new Date().toISOString().slice(0, 10) }));

  const loadBoard = useCallback(() => { setBoard(null); contestApi.leaderboard(month).then(setBoard).catch((e) => toast.error(errorMessage(e))); }, [month]);
  const loadPromos = useCallback(() => contestApi.promos().then(setPromos).catch(() => {}), []);
  useEffect(() => { loadBoard(); }, [loadBoard]);
  useEffect(() => { loadPromos(); }, [loadPromos]);

  const markPaid = async (r) => { try { const res = await contestApi.markPaid(r.id); toast.success(res.message); loadBoard(); } catch (e) { toast.error(errorMessage(e)); } };
  const newPromo = async () => { try { const res = await contestApi.createPromo(); loadPromos(); setEditingPromo(res.data); } catch (e) { toast.error(errorMessage(e)); } };
  const download = async () => {
    try {
      const blob = await contestApi.exportCsv(range);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `picks_${range.from}_${range.to}.csv` });
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const rewardsFor = (userId) => board?.rewards?.filter((r) => String(r.user?.id ?? r.user) === userId) ?? [];

  return (
    <>
      <PageHeader title="Picks contest" subtitle="Daily slips, the monthly leaderboard, winners' rewards and adverts." />
      <Settings />

      <div className="mb-3 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Leaderboard</h2>
        <select className="select select-sm w-auto" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
          {monthsBack(12).map((m) => <option key={m} value={m}>{monthLabel(m)}{m === thisMonth() ? ' (in progress)' : ''}</option>)}
        </select>
      </div>
      {!board ? <div className="skeleton h-48 rounded-box" /> : (
        <>
          {!board.closed && <p className="mb-3 text-sm text-base-content/60">This month is still running. Rewards can be given once it ends.</p>}
          {!board.rows.length ? <div className="glass-card p-6 text-sm text-base-content/60">No settled slips for {monthLabel(month)}.</div> : (
            <div className="glass-card overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>#</th><th>Customer</th><th className="text-right">Points</th><th className="text-right">Correct</th><th className="text-right">Wrong</th><th className="text-right">Slips</th><th className="text-right">Perfect</th><th>Rewards</th><th /></tr></thead>
                <tbody>
                  {board.rows.map((r) => (
                    <tr key={r.userId}>
                      <td className="font-mono">{r.rank === 1 ? <Crown className="size-4 text-warning" aria-label="1st" /> : r.rank}</td>
                      <td><p className="font-medium">{r.fullName}</p><p className="text-xs text-base-content/50">{r.email}</p></td>
                      <td className="text-right font-mono font-semibold">{r.points}</td>
                      <td className="text-right font-mono">{r.correct}</td>
                      <td className="text-right font-mono">{r.wrong}</td>
                      <td className="text-right font-mono">{r.slips}</td>
                      <td className="text-right font-mono">{r.perfectSlips}</td>
                      <td className="space-x-1">{rewardsFor(r.userId).map((w) => <span key={w.id} className={`badge badge-sm badge-soft ${STATUS_BADGE[w.status]}`}>{REWARD[w.type]} · {w.status}</span>)}</td>
                      <td className="text-right">{board.closed && <button type="button" className="btn btn-xs btn-primary btn-soft" onClick={() => setAwarding(r)}><Award className="size-3.5" />Reward</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {board.rewards?.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-semibold">Rewards for {monthLabel(month)}</h3>
              <div className="glass-card overflow-x-auto">
                <table className="table table-sm">
                  <thead><tr><th>Winner</th><th>Rank</th><th>Reward</th><th>Status</th><th>Given by</th><th>Note</th><th /></tr></thead>
                  <tbody>{board.rewards.map((r) => (
                    <tr key={r.id}>
                      <td>{fullName(r.user)}</td><td className="font-mono">#{r.rank}</td>
                      <td>{REWARD[r.type]}{r.type === 'cash' && ` · ${formatMoney(r.amount, r.currency)}`}{r.type === 'advert' && r.promo && ` · ${r.promo.status}`}</td>
                      <td><span className={`badge badge-sm badge-soft ${STATUS_BADGE[r.status]}`}>{r.status}{r.paidAt ? ` ${formatDate(r.paidAt)}` : ''}</span></td>
                      <td className="text-xs">{fullName(r.grantedBy)}</td><td className="max-w-56 text-xs text-base-content/60">{r.note}</td>
                      <td className="text-right">{r.type === 'cash' && r.status === 'pending' && <button type="button" className="btn btn-xs" onClick={() => markPaid(r)}><Wallet className="size-3.5" />Mark paid</button>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <div className="mb-3 mt-10 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Adverts</h2>
        <button type="button" className="btn btn-ghost btn-sm border-base-content/10" onClick={newPromo}><Plus className="size-4" />New advert</button>
      </div>
      {!promos.length ? <div className="glass-card p-6 text-sm text-base-content/60">No adverts yet. Choosing &quot;Advert spot&quot; as a reward creates one.</div> : (
        <div className="glass-card overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>Advert</th><th>For</th><th>Dates</th><th>Status</th><th /></tr></thead>
            <tbody>{promos.map((p) => {
              const showing = p.status === 'live' && new Date(p.startsAt) <= new Date() && new Date(p.endsAt) > new Date();
              return (
                <tr key={p.id}>
                  <td><p className="font-medium">{p.title}</p><p className="text-xs text-base-content/50">{p.label}</p></td>
                  <td className="text-xs">{p.owner ? fullName(p.owner) : '—'}</td>
                  <td className="whitespace-nowrap text-xs">{p.startsAt ? `${formatDate(p.startsAt)} – ${formatDate(p.endsAt)}` : 'Not set'}</td>
                  <td><span className={`badge badge-sm badge-soft ${STATUS_BADGE[p.status]}`}>{p.status === 'live' && !showing ? 'live · scheduled' : p.status}</span></td>
                  <td className="text-right"><button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditingPromo(p)}><Pencil className="size-3.5" />Edit</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Training data</h2>
      <div className="glass-card flex flex-wrap items-end gap-3 p-5">
        <label className="form-control text-sm"><span className="mb-1">From</span><input type="date" className="input input-sm" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label className="form-control text-sm"><span className="mb-1">To</span><input type="date" className="input input-sm" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        <button type="button" className="btn btn-sm" onClick={download}><Download className="size-4" />Download picks (CSV)</button>
        <p className="basis-full text-xs text-base-content/50">One row per pick with the model&apos;s pick and the result. Customers appear as a stable code, never a name or email.</p>
      </div>

      <AwardModal target={awarding} month={month} onClose={() => setAwarding(null)} onDone={() => { loadBoard(); loadPromos(); }} />
      <PromoModal promo={editingPromo} onClose={() => setEditingPromo(null)} onSaved={() => { loadPromos(); loadBoard(); }} />
    </>
  );
}
