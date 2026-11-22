import { Link } from 'react-router-dom';
import { Infinity as InfinityIcon } from 'lucide-react';

export default function UsageMeter({ usage, label }) {
  if (!usage) return <div className="skeleton h-16 w-full rounded-box sm:w-72" />;
  const unlimited = usage.limit === -1;
  const pct = unlimited ? 100 : usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 100;
  const exhausted = !unlimited && usage.remaining === 0;

  return (
    <div className="glass-card w-full px-4 py-3 sm:w-72">
      <div className="flex items-center justify-between text-sm">
        <span className="text-base-content/60">{label}</span>
        {unlimited ? (
          <span className="flex items-center gap-1 font-medium text-accent"><InfinityIcon className="size-4" /> Unlimited</span>
        ) : (
          <span className={`font-mono font-medium ${exhausted ? 'text-error' : ''}`}>{usage.remaining} / {usage.limit} left</span>
        )}
      </div>
      <progress className={`progress mt-2 h-1.5 ${exhausted ? 'progress-error' : 'progress-primary'}`} value={unlimited ? 100 : usage.used} max={unlimited ? 100 : usage.limit || 1} aria-label={`${pct}% used`} />
      {exhausted && <Link to="/app/billing" className="link link-primary mt-1 block text-xs">Upgrade for more today</Link>}
    </div>
  );
}
