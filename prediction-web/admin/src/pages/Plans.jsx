import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Archive, ArchiveRestore, Check, Pencil, Plus, Sparkles } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';
import { plansApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatMoney, INTERVAL } from '../utils/format';

const EMPTY = {
  name: '', slug: '', tagline: '', priceMajor: 0, currency: 'NGN', interval: 'monthly', featuresText: '',
  limits: { stockPredictionsPerDay: 3, sportsPredictionsPerDay: 3, premiumSignals: false, liveChat: false, apiAccess: false },
  highlighted: false, isActive: true, sortOrder: 0,
};

const toForm = (p) => ({
  ...EMPTY, ...p, priceMajor: p.price / 100, featuresText: (p.features || []).join('\n'), limits: { ...EMPTY.limits, ...p.limits },
});

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function LimitInput({ label, value, onChange }) {
  const unlimited = value === -1;
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend text-sm">{label}</legend>
      <div className="flex items-center gap-3">
        <input type="number" min={0} className="input w-28" value={unlimited ? '' : value} disabled={unlimited} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
        <label className="label cursor-pointer gap-2 text-sm"><input type="checkbox" className="checkbox checkbox-sm" checked={unlimited} onChange={(e) => onChange(e.target.checked ? -1 : 10)} /> Unlimited</label>
      </div>
    </fieldset>
  );
}

function PlanModal({ plan, open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const isNew = !plan?.id;
  useEffect(() => { if (open) { setForm(plan?.id ? toForm(plan) : EMPTY); setErrors({}); } }, [open, plan]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setLimit = (k, v) => setForm((f) => ({ ...f, limits: { ...f.limits, [k]: v } }));
  const priceChanged = !isNew && Math.round(form.priceMajor * 100) !== plan.price;

  const save = async () => {
    setBusy(true);
    const body = {
      name: form.name, slug: form.slug, tagline: form.tagline, price: Math.round(Number(form.priceMajor) * 100),
      currency: form.currency, interval: form.interval,
      features: form.featuresText.split('\n').map((s) => s.trim()).filter(Boolean),
      limits: form.limits, highlighted: form.highlighted, isActive: form.isActive, sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (isNew) await plansApi.create(body); else await plansApi.update(plan.id, body);
      toast.success(isNew ? 'Plan created' : 'Plan saved');
      onSaved();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'New plan' : `Edit ${plan.name}`} size="max-w-2xl"
      actions={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}Save plan</button></>}>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField label="Name" value={form.name} onChange={(e) => set({ name: e.target.value, ...(isNew && { slug: slugify(e.target.value) }) })} error={errors.name} />
        <FormField label="Slug" value={form.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} error={errors.slug} hint="Used in links, e.g. /register?plan=pro" />
        <FormField label="Tagline" value={form.tagline || ''} onChange={(e) => set({ tagline: e.target.value })} className="sm:col-span-2" />
        <FormField label={`Price (${form.currency})`} type="number" min={0} step="0.01" value={form.priceMajor} onChange={(e) => set({ priceMajor: e.target.value })} error={errors.price} hint="0 makes it the free plan" />
        <FormField as="select" label="Billing interval" value={form.interval} onChange={(e) => set({ interval: e.target.value })}>
          <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option>
        </FormField>
      </div>
      {priceChanged && (
        <div role="alert" className="alert alert-warning alert-soft mt-2 text-sm">Existing subscribers keep their current price. New checkouts use the new price.</div>
      )}
      <FormField as="textarea" rows={5} label="Features (one per line)" value={form.featuresText} onChange={(e) => set({ featuresText: e.target.value })} hint="Shown on the pricing page" />
      <div className="grid gap-x-4 sm:grid-cols-2">
        <LimitInput label="Stock predictions / day" value={form.limits.stockPredictionsPerDay} onChange={(v) => setLimit('stockPredictionsPerDay', v)} />
        <LimitInput label="Sports predictions / day" value={form.limits.sportsPredictionsPerDay} onChange={(v) => setLimit('sportsPredictionsPerDay', v)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[['premiumSignals', 'Premium signals'], ['liveChat', 'Live chat'], ['apiAccess', 'API access']].map(([k, label]) => (
          <label key={k} className="label cursor-pointer justify-start gap-3 text-sm"><input type="checkbox" className="toggle toggle-primary toggle-sm" checked={form.limits[k]} onChange={(e) => setLimit(k, e.target.checked)} /> {label}</label>
        ))}
        <label className="label cursor-pointer justify-start gap-3 text-sm"><input type="checkbox" className="toggle toggle-secondary toggle-sm" checked={form.highlighted} onChange={(e) => set({ highlighted: e.target.checked })} /> Highlight as “Most popular”</label>
        <label className="label cursor-pointer justify-start gap-3 text-sm"><input type="checkbox" className="toggle toggle-success toggle-sm" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} /> Visible on pricing page</label>
        <FormField label="Sort order" type="number" value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
      </div>
    </Modal>
  );
}

export default function Plans() {
  useDocumentTitle('Plans');
  const { currency } = useSiteConfig();
  const [plans, setPlans] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => plansApi.list().then(setPlans).catch((e) => toast.error(errorMessage(e))), []);
  useEffect(() => { load(); }, [load]);

  const toggleActive = async (p) => {
    try {
      if (p.isActive) await plansApi.archive(p.id); else await plansApi.update(p.id, { isActive: true });
      toast.success(p.isActive ? `${p.name} hidden from the pricing page` : `${p.name} restored`);
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <>
      <PageHeader title="Plans" subtitle="Pricing and limits shown on the site. Archived plans keep their existing subscribers."
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}><Plus className="size-4" /> New plan</button>} />
      {!plans ? <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-72 rounded-box" />)}</div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={`glass-card flex flex-col p-5 ${p.isActive ? '' : 'opacity-60'} ${p.highlighted ? 'border-primary/40' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">{p.name}{p.highlighted && <Sparkles className="size-4 text-primary" />}</h3>
                  <p className="font-mono text-xs text-base-content/50">/{p.slug}</p>
                </div>
                {!p.isActive && <span className="badge badge-ghost badge-sm">Archived</span>}
              </div>
              <p className="mt-3 font-display text-2xl font-bold">
                {p.price === 0 ? 'Free' : formatMoney(p.price, p.currency, currency.locale)}
                {p.price > 0 && <span className="text-sm font-normal text-base-content/60">/{INTERVAL[p.interval]}</span>}
              </p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent" />{f}</li>)}
              </ul>
              <p className="mt-3 text-xs text-base-content/50">
                Paystack: {p.price === 0 ? 'not needed' : p.paystackPlanCode ? <span className="font-mono">{p.paystackPlanCode}</span> : 'created at first checkout'}
              </p>
              <div className="mt-4 flex gap-2 border-t border-base-content/10 pt-4">
                <button type="button" className="btn btn-sm btn-ghost border-base-content/10" onClick={() => setEditing(p)}><Pencil className="size-4" /> Edit</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => toggleActive(p)}>
                  {p.isActive ? <><Archive className="size-4" /> Archive</> : <><ArchiveRestore className="size-4" /> Restore</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <PlanModal open={editing !== null} plan={editing} onClose={() => setEditing(null)} onSaved={load} />
    </>
  );
}
