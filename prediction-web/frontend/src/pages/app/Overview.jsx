import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CandlestickChart, Crown, History, Trophy, Zap } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import PredictionList from '../../components/predictions/PredictionList';
import { predictionsApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { usePredictionUsage } from '../../hooks/usePredictionUsage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDate } from '../../utils/format';

function StatTile({ icon: Icon, label, value, hint, tone = 'primary' }) {
  const tones = {
    primary: 'from-primary/20 text-primary',
    secondary: 'from-secondary/20 text-secondary',
    accent: 'from-accent/20 text-accent',
  };
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-content/60">{label}</p>
        <div className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br to-transparent ${tones[tone]}`}><Icon className="size-4" /></div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-base-content/50">{hint}</p>}
    </div>
  );
}

const usageValue = (u) => (!u ? '—' : u.limit === -1 ? `${u.used}` : `${u.used} / ${u.limit}`);
const usageHint = (u) => (!u ? '' : u.limit === -1 ? 'Unlimited on your plan' : `${u.remaining} left today`);

export default function Overview() {
  useDocumentTitle('Overview');
  const { user, plan, subscription } = useAuth();
  const { usage } = usePredictionUsage();
  const [recent, setRecent] = useState(null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    predictionsApi.list({ limit: 6 }).then((d) => setRecent(d.items)).catch(() => setRecent([]));
  }, []);

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        subtitle="Your plan and today's activity at a glance."
        actions={<Link to="/app/stocks" className="btn btn-primary"><Zap className="size-4" /> New prediction</Link>}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Crown} label="Current plan" value={plan?.name ?? '—'} hint={subscription?.endsAt ? `Renews ${formatDate(subscription.endsAt)}` : 'Free forever'} />
        <StatTile icon={CandlestickChart} label="Stock predictions today" value={usageValue(usage?.stock)} hint={usageHint(usage?.stock)} tone="secondary" />
        <StatTile icon={Trophy} label="Sports predictions today" value={usageValue(usage?.sports)} hint={usageHint(usage?.sports)} tone="accent" />
        <StatTile icon={Zap} label="Premium signals" value={plan?.limits?.premiumSignals ? 'On' : 'Off'} hint={plan?.limits?.premiumSignals ? 'Included in your plan' : 'Available on paid plans'} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {[
          { to: '/app/stocks', icon: CandlestickChart, title: 'Stock predictions', text: 'Forecast a ticker with the LSTM model and review its accuracy.' },
          { to: '/app/sports', icon: Trophy, title: 'Sports predictions', text: 'Browse fixtures and get win, draw and goals probabilities.' },
        ].map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="glass-card glass-card-hover group flex items-start gap-4 p-6">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary"><Icon className="size-6" /></div>
            <div className="flex-1">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-base-content/60">{text}</p>
            </div>
            <ArrowUpRight className="size-5 text-base-content/40 transition group-hover:text-primary" />
          </Link>
        ))}
      </div>

      <div className="mt-12 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent predictions</h2>
        {recent?.length > 0 && <Link to="/app/history" className="link link-hover text-sm">View all</Link>}
      </div>
      {recent === null ? (
        <div className="skeleton h-40 rounded-box" />
      ) : recent.length ? (
        <PredictionList items={recent} />
      ) : (
        <EmptyState icon={History} title="No predictions yet">Predictions you run will appear here with their charts and accuracy metrics.</EmptyState>
      )}
    </>
  );
}
