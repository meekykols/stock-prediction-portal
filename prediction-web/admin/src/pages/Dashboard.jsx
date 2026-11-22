import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, Banknote, CandlestickChart, CheckCircle2, Inbox, Repeat, Trophy, UserPlus, Users, XCircle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { dashboardApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { compactMoney, formatMoney, INTERVAL } from '../utils/format';

const grid = 'color-mix(in oklch, var(--color-base-content) 8%, transparent)';
const axis = { stroke: 'color-mix(in oklch, var(--color-base-content) 45%, transparent)', tick: { fontSize: 11, fill: 'color-mix(in oklch, var(--color-base-content) 50%, transparent)' }, tickLine: false, axisLine: false };
const tooltip = {
  contentStyle: { background: 'var(--color-base-200)', border: '1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent)', borderRadius: '0.75rem', fontSize: 12 },
  labelStyle: { color: 'var(--color-base-content)' },
};
const shortDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

function Health({ label, ok, detail }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-success' : 'text-error'}`}>
        {ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />} {detail}
      </span>
    </li>
  );
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { currency } = useSiteConfig();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.stats().then(setStats).catch((e) => setError(errorMessage(e)));
    dashboardApi.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  if (error) return <div role="alert" className="alert alert-error alert-soft">{error}</div>;
  if (!stats) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-box" />)}</div>;

  const cur = stats.currency || currency.code;
  const money = (v) => formatMoney(v, cur, currency.locale);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Last 30 days at a glance. Times are UTC." />

      {(stats.subscriptions.paymentIssues > 0 || stats.messages.new > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {stats.subscriptions.paymentIssues > 0 && (
            <Link to="/subscriptions?status=live&issue=true" className="alert alert-warning alert-soft w-auto py-2">
              <AlertTriangle className="size-4" /> {stats.subscriptions.paymentIssues} subscription(s) with a failed renewal
            </Link>
          )}
          {stats.messages.new > 0 && (
            <Link to="/messages?status=new" className="alert alert-info alert-soft w-auto py-2">
              <Inbox className="size-4" /> {stats.messages.new} new message(s)
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Banknote} label="Monthly recurring revenue" value={money(stats.revenue.mrr)} hint="Auto-renewing subscriptions, per month" />
        <StatCard icon={Repeat} label="Revenue (30 days)" value={money(stats.revenue.last30)} hint={`${stats.revenue.payments30} payment(s)`} tone="accent" />
        <StatCard icon={Users} label="Paying subscribers" value={stats.subscriptions.paying} hint={`${stats.subscriptions.live} with an active paid plan`} tone="secondary" />
        <StatCard icon={UserPlus} label="Customers" value={stats.customers.total.toLocaleString()} hint={`+${stats.customers.new7} this week · +${stats.customers.new30} in 30 days`} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="glass-card p-5 xl:col-span-2">
          <h2 className="font-semibold">Revenue</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenue.series} margin={{ left: 0, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="1" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
                <YAxis width={64} tickFormatter={(v) => compactMoney(v, cur, currency.locale)} {...axis} />
                <Tooltip {...tooltip} labelFormatter={shortDate} formatter={(v) => [money(v), 'Revenue']} />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-5">
          <h2 className="font-semibold">New customers</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.signups.series} margin={{ left: -16, right: 8, top: 4 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
                <YAxis allowDecimals={false} width={40} {...axis} />
                <Tooltip {...tooltip} labelFormatter={shortDate} formatter={(v) => [v, 'Sign-ups']} cursor={{ fill: grid }} />
                <Bar dataKey="value" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="glass-card overflow-x-auto p-5 xl:col-span-2">
          <h2 className="font-semibold">Active plans</h2>
          {stats.subscriptions.byPlan.length === 0 ? (
            <p className="mt-4 text-sm text-base-content/60">No paid or complimentary plans yet.</p>
          ) : (
            <table className="table table-sm mt-2">
              <thead><tr><th>Plan</th><th className="text-right">Paying</th><th className="text-right">Complimentary</th><th className="text-right">Price</th></tr></thead>
              <tbody>
                {stats.subscriptions.byPlan.map((p) => (
                  <tr key={p.planId}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-right font-mono">{p.paying}</td>
                    <td className="text-right font-mono">{p.complimentary}</td>
                    <td className="text-right font-mono">{money(p.price)}/{INTERVAL[p.interval]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h2 className="font-semibold">Predictions today</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-field bg-primary/10 p-3"><CandlestickChart className="size-4 text-primary" /><p className="mt-1 font-mono text-xl font-bold">{stats.predictions.today.market || 0}</p><p className="text-xs text-base-content/60">Markets</p></div>
              <div className="rounded-field bg-secondary/10 p-3"><Trophy className="size-4 text-secondary" /><p className="mt-1 font-mono text-xl font-bold">{stats.predictions.today.sports || 0}</p><p className="text-xs text-base-content/60">Sports</p></div>
            </div>
            <p className="mt-3 text-xs text-base-content/50">{stats.predictions.last30.toLocaleString()} in the last 30 days</p>
          </div>
          <div className="glass-card p-5">
            <h2 className="font-semibold">Services</h2>
            {health ? (
              <ul className="mt-2 divide-y divide-base-content/10">
                <Health label="API" ok={health.api.ok} detail="Online" />
                <Health label="ML service" ok={health.mlService.ok} detail={health.mlService.ok ? 'Online' : 'Offline'} />
                <Health label="Sports data" ok={Boolean(health.mlService.sportsDataConfigured)} detail={health.mlService.sportsDataConfigured ? 'Connected' : 'Not configured'} />
                <Health label="Payments (Paystack)" ok={health.payments.ok} detail={health.payments.ok ? 'Configured' : 'Not configured'} />
              </ul>
            ) : <div className="skeleton mt-3 h-24" />}
          </div>
        </div>
      </div>
    </>
  );
}
