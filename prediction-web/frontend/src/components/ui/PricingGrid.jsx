import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';
import PlanCard from './PlanCard';
import { fetchPlans } from '../../store/plansSlice';
import { useAuth } from '../../hooks/useAuth';

export default function PricingGrid() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.plans);
  const { isAuthenticated, plan: currentPlan } = useAuth();

  useEffect(() => { dispatch(fetchPlans()); }, [dispatch]);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-[28rem] rounded-box" />)}
      </div>
    );
  }
  if (status === 'error') {
    return <div role="alert" className="alert alert-warning alert-soft">Plans could not be loaded right now. Please refresh in a moment.</div>;
  }

  return (
    <div className={`grid items-stretch gap-6 ${items.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
      {items.map((plan) => {
        const isCurrent = currentPlan?.id === plan.id;
        const to = isAuthenticated ? '/app/billing' : `/register?plan=${plan.slug}`;
        return (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={isCurrent}
            action={
              <Link to={to} className={`btn btn-block ${plan.highlighted ? 'btn-primary' : 'btn-outline border-base-content/20'}`}>
                {isCurrent ? 'Manage plan' : plan.price === 0 ? 'Start free' : `Choose ${plan.name}`}
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        );
      })}
    </div>
  );
}
