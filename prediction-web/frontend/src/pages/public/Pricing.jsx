import { useSelector } from 'react-redux';
import { Check, Minus } from 'lucide-react';
import SectionHeading from '../../components/ui/SectionHeading';
import PricingGrid from '../../components/ui/PricingGrid';
import Faq from '../../components/ui/Faq';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatLimit } from '../../utils/format';

const ROWS = [
  { label: 'Stock predictions / day', get: (p) => formatLimit(p.limits?.stockPredictionsPerDay) },
  { label: 'Sports predictions / day', get: (p) => formatLimit(p.limits?.sportsPredictionsPerDay) },
  { label: 'Premium signals feed', get: (p) => p.limits?.premiumSignals },
  { label: 'Live chat support', get: (p) => p.limits?.liveChat },
  { label: 'API access', get: (p) => p.limits?.apiAccess },
];

function Cell({ value }) {
  if (value === true) return <Check className="mx-auto size-5 text-success" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto size-5 text-base-content/30" aria-label="Not included" />;
  return <span className="font-mono">{value}</span>;
}

export default function Pricing() {
  useDocumentTitle('Pricing');
  const plans = useSelector((s) => s.plans.items);

  return (
    <div className="relative">
      <div className="bg-grid absolute inset-x-0 top-0 -z-10 h-[32rem]" />
      <section className="container-x pt-16 pb-12">
        <SectionHeading
          eyebrow="Pricing"
          title={<>Choose the plan that <span className="text-gradient">fits your edge</span></>}
          subtitle="All plans include the core dashboard. Upgrade or cancel any time."
        />
        <div className="mt-16"><PricingGrid /></div>
      </section>

      {plans.length > 0 && (
        <section className="container-x py-16">
          <h2 className="text-center text-2xl font-bold">Compare plans</h2>
          <div className="glass-card mt-8 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="min-w-48">Feature</th>
                  {plans.map((p) => <th key={p.id} className="text-center">{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="text-base-content/80">{row.label}</td>
                    {plans.map((p) => <td key={p.id} className="text-center"><Cell value={row.get(p)} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="container-x py-16">
        <SectionHeading title="Frequently asked questions" />
        <div className="mt-10"><Faq /></div>
      </section>
    </div>
  );
}
