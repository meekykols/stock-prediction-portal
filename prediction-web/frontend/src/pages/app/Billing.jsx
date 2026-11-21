import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowRight, CalendarClock, CreditCard, Lock, Receipt, RefreshCw, XCircle,
} from 'lucide-react';
import PageHeader from './PageHeader';
import PlanCard from '../../components/ui/PlanCard';
import EmptyState from '../../components/ui/EmptyState';
import { fetchPlans } from '../../store/plansSlice';
import { bootstrapSession } from '../../store/authSlice';
import { billingApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDate, formatMoney } from '../../utils/format';

const PAYMENT_BADGE = { success: 'badge-success', failed: 'badge-error', abandoned: 'badge-ghost' };

function CurrentPlanCard({ summary, plan, onChanged }) {
  const sub = summary?.subscription;
  const [busy, setBusy] = useState(null);
  const confirmRef = useRef(null);

  const act = async (kind) => {
    setBusy(kind);
    try {
      if (kind === 'card') {
        const { url } = await billingApi.manageCard();
        window.open(url, '_blank', 'noopener');
      } else {
        const res = await (kind === 'cancel' ? billingApi.cancel() : billingApi.resume());
        toast.success(res.message);
        onChanged(res.data);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
      confirmRef.current?.close();
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary"><CreditCard className="size-6" /></div>
          <div>
            <p className="text-sm text-base-content/60">Current plan</p>
            <p className="font-display text-xl font-semibold">{plan?.name ?? '—'}</p>
          </div>
        </div>
        <div className="text-sm sm:text-right">
          {sub ? (
            <>
              <span className={`badge badge-soft ${sub.autoRenew ? 'badge-success' : 'badge-warning'}`}>{sub.autoRenew ? 'Auto-renew on' : 'Auto-renew off'}</span>
              <p className="mt-1 flex items-center gap-1.5 text-base-content/70 sm:justify-end">
                <CalendarClock className="size-4" />
                {sub.autoRenew ? `Renews ${formatDate(sub.endsAt)}` : `Access until ${formatDate(sub.endsAt)}`}
              </p>
            </>
          ) : (
            <span className="badge badge-primary badge-soft">Free forever</span>
          )}
        </div>
      </div>

      {sub?.paymentIssue && (
        <div role="alert" className="alert alert-warning alert-soft mt-5">
          <AlertTriangle className="size-5" />
          <span>We couldn&apos;t charge your card for the latest renewal. Update your card to keep your plan.</span>
          <button type="button" className="btn btn-sm btn-warning" onClick={() => act('card')} disabled={busy}>Update card</button>
        </div>
      )}

      {sub && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-base-content/10 pt-5">
          <button type="button" className="btn btn-sm btn-ghost border-base-content/10" onClick={() => act('card')} disabled={busy}>
            {busy === 'card' ? <span className="loading loading-spinner loading-xs" /> : <CreditCard className="size-4" />} Update card
          </button>
          {sub.autoRenew ? (
            <button type="button" className="btn btn-sm btn-ghost text-error" onClick={() => confirmRef.current?.showModal()} disabled={busy}>
              <XCircle className="size-4" /> Cancel auto-renew
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-primary btn-soft" onClick={() => act('resume')} disabled={busy}>
              {busy === 'resume' ? <span className="loading loading-spinner loading-xs" /> : <RefreshCw className="size-4" />} Turn auto-renew back on
            </button>
          )}
        </div>
      )}

      <dialog ref={confirmRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Cancel auto-renew?</h3>
          <p className="py-4 text-base-content/70">
            You won&apos;t be charged again. You keep {plan?.name} until {formatDate(sub?.endsAt)}, then move to the free plan. You can turn auto-renew back on any time before then.
          </p>
          <div className="modal-action">
            <form method="dialog"><button type="submit" className="btn btn-ghost">Keep my plan</button></form>
            <button type="button" className="btn btn-error" onClick={() => act('cancel')} disabled={busy === 'cancel'}>
              {busy === 'cancel' && <span className="loading loading-spinner loading-xs" />} Cancel auto-renew
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button type="submit">close</button></form>
      </dialog>
    </div>
  );
}

export default function Billing() {
  useDocumentTitle('Plan & billing');
  const dispatch = useDispatch();
  const { items: plans, status } = useSelector((s) => s.plans);
  const { plan: currentPlan } = useAuth();
  const { currency } = useSiteConfig();
  const [params] = useSearchParams();
  const requested = params.get('plan');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState(null);
  const [checkingOut, setCheckingOut] = useState(null);

  useEffect(() => { dispatch(fetchPlans()); }, [dispatch]);
  useEffect(() => {
    billingApi.summary().then(setSummary).catch(() => setSummary({ paymentsEnabled: false, subscription: null }));
    billingApi.payments().then(setPayments).catch(() => setPayments([]));
  }, []);

  const onSummaryChanged = (next) => {
    setSummary(next);
    dispatch(bootstrapSession()); // refresh the plan shown across the app
  };

  const checkout = async (plan) => {
    setCheckingOut(plan.slug);
    try {
      const { authorizationUrl } = await billingApi.checkout(plan.slug);
      window.location.assign(authorizationUrl);
    } catch (err) {
      toast.error(errorMessage(err));
      setCheckingOut(null);
    }
  };

  const paymentsEnabled = summary?.paymentsEnabled;
  const hasPaid = Boolean(summary?.subscription);

  const actionFor = (plan) => {
    const isCurrent = currentPlan?.id === plan.id;
    if (isCurrent) return <button type="button" className="btn btn-block btn-ghost border-base-content/10" disabled>Your plan</button>;
    if (plan.price === 0) {
      return (
        <p className="text-center text-xs text-base-content/60">
          {hasPaid ? 'Cancel auto-renew above to move here when your period ends.' : 'Included for everyone.'}
        </p>
      );
    }
    if (!paymentsEnabled) return <button type="button" className="btn btn-block" disabled>Coming soon</button>;
    const upgrade = !currentPlan || plan.price > currentPlan.price;
    return (
      <button
        type="button"
        className={`btn btn-block ${plan.highlighted || requested === plan.slug ? 'btn-primary' : 'btn-outline border-base-content/20'}`}
        onClick={() => checkout(plan)}
        disabled={checkingOut !== null}
      >
        {checkingOut === plan.slug ? <span className="loading loading-spinner loading-sm" /> : null}
        {upgrade ? 'Upgrade' : 'Switch'} to {plan.name} <ArrowRight className="size-4" />
      </button>
    );
  };

  return (
    <>
      <PageHeader title="Plan & billing" subtitle="Manage your subscription and see past payments." />

      {summary ? <CurrentPlanCard summary={summary} plan={currentPlan} onChanged={onSummaryChanged} /> : <div className="skeleton h-32 rounded-box" />}

      <div className="mt-10 mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Available plans</h2>
        {paymentsEnabled && (
          <p className="flex items-center gap-1.5 text-xs text-base-content/60">
            <Lock className="size-3.5" /> Secure checkout by Paystack. A new plan starts immediately; unused time on the old plan isn&apos;t refunded.
          </p>
        )}
      </div>
      {status !== 'ready' || !summary ? (
        <div className="grid gap-6 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-96 rounded-box" />)}</div>
      ) : (
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className={requested === plan.slug && currentPlan?.id !== plan.id ? 'rounded-box ring-2 ring-primary ring-offset-4 ring-offset-base-100' : ''}>
              <PlanCard plan={plan} current={currentPlan?.id === plan.id} action={actionFor(plan)} />
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-12 mb-4 text-lg font-semibold">Payment history</h2>
      {payments === null ? (
        <div className="skeleton h-32 rounded-box" />
      ) : payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments yet">Receipts for paid plans will be listed here.</EmptyState>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Date</th><th>Plan</th><th>Type</th><th>Card</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap">{formatDate(p.paidAt || p.createdAt)}</td>
                  <td>{p.plan?.name}</td>
                  <td className="capitalize text-base-content/70">{p.kind}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{p.card?.last4 ? `${(p.card.brand || '').toUpperCase()} ••${p.card.last4}` : '—'}</td>
                  <td className="text-right font-mono">{formatMoney(p.amount, p.currency, currency.locale)}</td>
                  <td><span className={`badge badge-soft badge-sm capitalize ${PAYMENT_BADGE[p.status] || 'badge-ghost'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
