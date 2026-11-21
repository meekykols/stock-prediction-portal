import { Check, Sparkles } from 'lucide-react';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { formatMoney, INTERVAL_LABEL } from '../../utils/format';

export default function PlanCard({ plan, action, current = false }) {
  const { currency } = useSiteConfig();
  const featured = plan.highlighted;

  return (
    <div
      className={`relative flex flex-col p-7 glass-card ${
        featured ? 'border-primary/50 shadow-[0_0_60px_-20px] shadow-primary/60 lg:-my-3 lg:py-10' : ''
      }`}
    >
      {featured && (
        <span className="badge badge-primary absolute -top-3 left-1/2 -translate-x-1/2 gap-1 font-medium">
          <Sparkles className="size-3" /> Most popular
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-semibold">{plan.name}</h3>
        {current && <span className="badge badge-success badge-soft">Current plan</span>}
      </div>
      {plan.tagline && <p className="mt-1 text-sm text-base-content/60">{plan.tagline}</p>}

      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold">
          {plan.price === 0 ? 'Free' : formatMoney(plan.price, plan.currency || currency.code, currency.locale)}
        </span>
        {plan.price > 0 && <span className="text-base-content/60">{INTERVAL_LABEL[plan.interval]}</span>}
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {plan.features?.map((f) => (
          <li key={f} className="flex gap-3">
            <Check className={`mt-0.5 size-4 shrink-0 ${featured ? 'text-primary' : 'text-accent'}`} />
            <span className="text-base-content/80">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">{action}</div>
    </div>
  );
}
