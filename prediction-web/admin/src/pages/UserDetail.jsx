import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Ban, CandlestickChart, Gift, Mail, Phone, RotateCcw, Trophy, XCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';
import Forbidden from '../components/ui/Forbidden';
import { billingApi, plansApi, usersApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { P } from '../routers/permissions';
import { formatDate, formatDateTime, formatMoney, fullName, initials } from '../utils/format';

function GrantModal({ open, onClose, userId, onDone }) {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ planId: '', days: 30, note: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    plansApi.list().then((list) => {
      const paid = list.filter((p) => p.price > 0 && p.isActive);
      setPlans(paid);
      setForm((f) => ({ ...f, planId: f.planId || paid[0]?.id || '' }));
    }).catch(() => setPlans([]));
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await usersApi.grant(userId, { ...form, days: Number(form.days) });
      toast.success(res.message);
      onDone();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Grant a complimentary plan"
      actions={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={submit} disabled={busy || !form.planId}>{busy && <span className="loading loading-spinner loading-xs" />}Grant plan</button></>}>
      <p className="text-sm text-base-content/70">The customer gets the plan free for the chosen number of days. It does not renew and nothing is charged.</p>
      <FormField as="select" label="Plan" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} error={errors.planId}>
        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </FormField>
      <FormField label="Days" type="number" min={1} max={730} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} error={errors.days} />
      <FormField label="Internal note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Compensation for outage" error={errors.note} />
    </Modal>
  );
}

function CancelModal({ sub, onClose, onDone }) {
  const [busy, setBusy] = useState(null);
  const go = async (immediate) => {
    setBusy(immediate ? 'now' : 'end');
    try {
      const res = await billingApi.cancel(sub.id, immediate);
      toast.success(res.message);
      onDone();
      onClose();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(null); }
  };
  const complimentary = sub?.source === 'admin';
  return (
    <Modal open={Boolean(sub)} onClose={onClose} title={`Cancel ${sub?.plan?.name ?? ''} subscription`}
      actions={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Keep it</button>
        {!complimentary && sub?.status === 'active' && <button type="button" className="btn btn-warning" onClick={() => go(false)} disabled={busy}>{busy === 'end' && <span className="loading loading-spinner loading-xs" />}At period end</button>}
        <button type="button" className="btn btn-error" onClick={() => go(true)} disabled={busy}>{busy === 'now' && <span className="loading loading-spinner loading-xs" />}End access now</button>
      </>}>
      <p className="text-sm text-base-content/70">
        {complimentary
          ? 'This complimentary plan ends immediately and the customer returns to the free plan.'
          : `"At period end" stops renewal at Paystack and keeps access until ${formatDate(sub?.endsAt)}. "End access now" also removes access immediately. Refunds, if any, are issued from the Paystack dashboard.`}
      </p>
    </Modal>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { currency } = useSiteConfig();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [grantOpen, setGrantOpen] = useState(false);
  const [cancelSub, setCancelSub] = useState(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(data ? fullName(data.user) : 'Customer');

  const load = useCallback(() => usersApi.get(id).then(setData).catch((e) => setError(errorMessage(e))), [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <div role="alert" className="alert alert-error alert-soft">{error}</div>;
  if (!data) return <div className="space-y-4"><div className="skeleton h-32 rounded-box" /><div className="skeleton h-64 rounded-box" /></div>;
  const { user, entitlement, subscriptions, payments, predictions } = data;
  if (user.role !== 'customer' && !can('superadmin')) return <Forbidden />;

  const toggleStatus = async () => {
    setBusy(true);
    try {
      await usersApi.update(user.id, { status: user.status === 'active' ? 'suspended' : 'active' });
      toast.success(user.status === 'active' ? 'Account suspended and signed out everywhere' : 'Account reactivated');
      load();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const canManageSubs = can(P.SUBSCRIPTIONS_MANAGE);
  const live = (s) => ['active', 'non_renewing'].includes(s.status) && new Date(s.endsAt) > new Date(Date.now() - 864e5);

  return (
    <>
      <PageHeader
        back={<Link to="/users" className="btn btn-ghost btn-xs mb-2 gap-1 px-1"><ArrowLeft className="size-3.5" /> Customers</Link>}
        title={fullName(user)}
        subtitle={`Customer since ${formatDate(user.createdAt)}`}
        actions={<>
          {canManageSubs && <button type="button" className="btn btn-sm btn-primary btn-soft" onClick={() => setGrantOpen(true)}><Gift className="size-4" /> Grant plan</button>}
          {can(P.USERS_MANAGE) && (
            <button type="button" className={`btn btn-sm ${user.status === 'active' ? 'btn-error btn-soft' : 'btn-success btn-soft'}`} onClick={toggleStatus} disabled={busy}>
              {user.status === 'active' ? <><Ban className="size-4" /> Suspend</> : <><RotateCcw className="size-4" /> Reactivate</>}
            </button>
          )}
        </>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-5">
          <div className="flex items-center gap-4">
            <div className="avatar avatar-placeholder"><div className="w-14 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content"><span className="text-lg font-semibold">{initials(user)}</span></div></div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{fullName(user)}</p>
              <StatusBadge status={user.status} />
            </div>
          </div>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Mail className="size-4 text-base-content/50" /><a href={`mailto:${user.email}`} className="link link-hover truncate">{user.email}</a></li>
            {user.phone && <li className="flex items-center gap-2"><Phone className="size-4 text-base-content/50" />{user.phone}</li>}
            <li className="text-base-content/60">Country: {user.country || '—'}</li>
            <li className="text-base-content/60">Last sign-in: {formatDateTime(user.lastLoginAt)}</li>
          </ul>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-base-content/60">Current plan</p>
          <p className="mt-1 font-display text-2xl font-bold">{entitlement.plan?.name ?? '—'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={entitlement.status} />
            {entitlement.source && <StatusBadge status={entitlement.source} />}
          </div>
          {entitlement.endsAt && <p className="mt-3 text-sm text-base-content/60">{entitlement.status === 'active' ? 'Renews' : 'Access until'} {formatDate(entitlement.endsAt)}</p>}
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-base-content/60">Predictions</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-field bg-primary/10 p-3"><CandlestickChart className="size-4 text-primary" /><p className="mt-1 font-mono text-xl font-bold">{predictions.counts.stock || 0}</p><p className="text-xs text-base-content/60">Stocks</p></div>
            <div className="rounded-field bg-secondary/10 p-3"><Trophy className="size-4 text-secondary" /><p className="mt-1 font-mono text-xl font-bold">{predictions.counts.sports || 0}</p><p className="text-xs text-base-content/60">Sports</p></div>
          </div>
          <p className="mt-3 text-xs text-base-content/50">Last: {formatDateTime(predictions.lastAt)}</p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Subscriptions</h2>
      {subscriptions.length === 0 ? <p className="text-sm text-base-content/60">No subscriptions yet.</p> : (
        <div className="glass-card overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>Plan</th><th>Status</th><th>Source</th><th>Started</th><th>Ends</th><th>Note</th><th /></tr></thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.plan?.name}</td>
                  <td><StatusBadge status={s.status} />{s.paymentIssueAt && <span className="badge badge-warning badge-sm ml-1">payment issue</span>}</td>
                  <td><StatusBadge status={s.source} /></td>
                  <td>{formatDate(s.startsAt)}</td>
                  <td>{formatDate(s.endsAt)}</td>
                  <td className="max-w-48 truncate text-xs text-base-content/60">{s.note || (s.cancelReason ? `Cancelled: ${s.cancelReason}` : '')}</td>
                  <td className="text-right">{canManageSubs && live(s) && <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => setCancelSub(s)}><XCircle className="size-3.5" /> Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-8 font-semibold">Payments</h2>
      {payments.length === 0 ? <p className="text-sm text-base-content/60">No payments yet.</p> : (
        <div className="glass-card overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>Date</th><th>Plan</th><th>Type</th><th className="text-right">Amount</th><th>Status</th><th>Reference</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.paidAt || p.createdAt)}</td>
                  <td>{p.plan?.name}</td>
                  <td className="capitalize">{p.kind}</td>
                  <td className="text-right font-mono">{formatMoney(p.amount, p.currency, currency.locale)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="font-mono text-xs text-base-content/60">{p.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GrantModal open={grantOpen} onClose={() => setGrantOpen(false)} userId={user.id} onDone={load} />
      <CancelModal sub={cancelSub} onClose={() => setCancelSub(null)} onDone={load} />
    </>
  );
}
