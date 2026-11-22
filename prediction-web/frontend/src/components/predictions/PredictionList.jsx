import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, CandlestickChart, ChevronRight, Trophy } from 'lucide-react';
import { formatDateTime, formatPct, formatPrice, formatProb } from '../../utils/format';

function StockRow({ p }) {
  const s = p.summary;
  const up = s.direction === 'up';
  return (
    <>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><CandlestickChart className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-mono font-semibold">{s.ticker}</p>
        <p className="text-xs text-base-content/50">{s.horizonDays}-day outlook · {formatDateTime(p.createdAt)}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm">{formatPrice(s.targetPrice, s.currency)}</p>
        <p className={`flex items-center justify-end gap-0.5 text-xs font-medium ${up ? 'text-success' : 'text-error'}`}>
          {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{formatPct(s.changePct)}
        </p>
      </div>
    </>
  );
}

function SportsRow({ p }) {
  const s = p.summary;
  const pick = { home: s.home, draw: 'Draw', away: s.away }[s.pick?.outcome];
  return (
    <>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary"><Trophy className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{s.home} vs {s.away}</p>
        <p className="truncate text-xs text-base-content/50">{s.league} · {formatDateTime(s.kickoff)}</p>
      </div>
      <div className="text-right">
        <p className="max-w-32 truncate text-sm">{pick}</p>
        <p className="text-xs text-base-content/60">{formatProb(s.pick?.probability)}</p>
      </div>
    </>
  );
}

export default function PredictionList({ items }) {
  return (
    <ul className="glass-card divide-y divide-base-content/10">
      {items.map((p) => (
        <li key={p.id}>
          <Link to={`/app/predictions/${p.id}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-base-content/5 sm:px-5">
            {p.type === 'stock' ? <StockRow p={p} /> : <SportsRow p={p} />}
            <ChevronRight className="size-4 shrink-0 text-base-content/30" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
