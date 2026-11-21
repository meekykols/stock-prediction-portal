import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Receipt } from 'lucide-react';
import PageHeader from './PageHeader';
import PlanCard from '../../components/ui/PlanCard';
import EmptyState from '../../components/ui/EmptyState';
import { fetchPlans } from '../../store/plansSlice';
import { accountApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDate, formatMoney } from '../../utils/format';

const STATUS_BADGE = {
  active: 'badge-success', non_renewing: 'badge-warning', pending: 'badge-info',
  cancelled: 'badge-ghost', expired: 'badge-ghost', free: 'badge-primary',
};

export default function Billing() {
  useDocumentTitle('Plan & billing');
  const dispatch = useDispatch();
  const { items: plans, status } = useSelector((s) => s.plans);
  const { plan: currentPlan, subscription } = useAuth();
  const { currency } = useSiteConfig();
  const [params] = useSearchParams();
  const requested = params.get('plan');
  const [history, setHistory] = useState(null);

  useEffect(() => { dispatch(fetchPlans()); }, [dispatch]);
  useEffect(() => {
    accountApi.subscriptions().then(setHistory).catch(() => setHistory([]));
  }, []);

  return (
    <>
      <PageHeader title="Plan & billing" subtitle="Manage your subscription and see past payments." />

      <div className="glass-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary"><CreditCard className="size-6" /></div>
          <div>
            <p className="text-sm text-base-content/60">Current plan</p>
            <p className="font-display text-xl font-semibold">{currentPlan?.name ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={`badge badge-soft ${STATUS_BADGE[subscription?.status] || 'badge-ghost'}`}>{subscription?.status?.replace('_', ' ')}</span>
          {subscription?.endsAt && <span className="text-base-content/60">Until {formatDate(subscription.endsAt)}</span>}
        </div>
      </div>

      <div role="alert" className="alert alert-info alert-soft mt-6">
        <span>Online upgrades through Paystack are launching soon. Your current plan stays active in the meantime.</span>
      </div>

      <h2 className="mt-10 mb-6 text-lg font-semibold">Available plans</h2>
      {status !== 'ready' ? (
        <div className="grid gap-6 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-96 rounded-box" />)}</div>
      ) : (
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.id === plan.id;
            return (
              <div key={plan.id} className={requested === plan.slug && !isCurrent ? 'rounded-box ring-2 ring-primary ring-offset-4 ring-offset-base-100' : ''}>
                <PlanCard
                  plan={plan}
                  current={isCurrent}
                  action={
                    <button type="button" className={`btn btn-block ${plan.highlighted ? 'btn-primary' : 'btn-outline border-base-content/20'}`} disabled>
                      {isCurrent ? 'Your plan' : 'Coming soon'}
                    </button>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-12 mb-4 text-lg font-semibold">Payment history</h2>
      {history === null ? (
        <div className="skeleton h-32 rounded-box" />
      ) : history.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments yet">Receipts for paid plans will be listed here.</EmptyState>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Plan</th><th>Amount</th><th>Status</th><th>Started</th><th>Ends</th></tr></thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id}>
                  <td>{s.plan?.name}</td>
                  <td className="font-mono">{formatMoney(s.amount, s.currency, currency.locale)}</td>
                  <td><span className={`badge badge-soft badge-sm ${STATUS_BADGE[s.status]}`}>{s.status.replace('_', ' ')}</span></td>
                  <td>{formatDate(s.startsAt)}</td>
                  <td>{formatDate(s.endsAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
