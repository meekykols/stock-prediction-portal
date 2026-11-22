import { useEffect, useState } from 'react';
import { CandlestickChart, Sparkles, Trophy } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Pagination from '../components/ui/Pagination';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import UserCell from '../components/ui/UserCell';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { predictionsApi } from '../api/endpoints';
import { usePagedQuery } from '../hooks/usePagedQuery';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime } from '../utils/format';

const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);

function Summary({ p }) {
  const s = p.summary || {};
  if (p.type === 'stock') {
    return (
      <div className="flex items-center gap-3">
        <CandlestickChart className="size-4 shrink-0 text-primary" />
        <div>
          <p className="font-mono font-semibold">{s.ticker} <span className="font-sans text-xs font-normal text-base-content/50">{s.horizonDays}-day</span></p>
          <p className={`text-xs ${s.direction === 'up' ? 'text-success' : 'text-error'}`}>{s.changePct > 0 ? '+' : ''}{s.changePct?.toFixed?.(2)}% → {s.targetPrice?.toFixed?.(2)} {s.currency}</p>
        </div>
      </div>
    );
  }
  const pick = { home: s.home, draw: 'Draw', away: s.away }[s.pick?.outcome];
  return (
    <div className="flex items-center gap-3">
      <Trophy className="size-4 shrink-0 text-secondary" />
      <div className="min-w-0">
        <p className="truncate font-medium">{s.home} vs {s.away}</p>
        <p className="truncate text-xs text-base-content/60">{s.league} · pick {pick} ({pct(s.pick?.probability)})</p>
      </div>
    </div>
  );
}

function Detail({ id, onClose }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    predictionsApi.get(id).then((d) => !cancelled && setState({ id, d })).catch(() => !cancelled && setState({ id, d: null }));
    return () => { cancelled = true; };
  }, [id]);
  const p = state?.id === id ? state.d : null;
  const r = p?.result;
  return (
    <Modal open={Boolean(id)} onClose={onClose} title="Prediction details" size="max-w-xl">
      {!p ? <div className="skeleton h-40" /> : p.type === 'stock' ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[['Ticker', r.ticker], ['Last close', `${r.lastClose} ${r.currency || ''}`], ['Target', `${r.outlook.targetPrice} (${r.outlook.changePct}%)`], ['Horizon', `${r.outlook.horizonDays} days`],
            ['R²', r.metrics.r2], ['MAPE', `${r.metrics.mape}%`], ['Direction hit rate', pct(r.metrics.directionalAccuracy)], ['Model', r.model.name]].map(([k, v]) => (
            <div key={k} className="rounded-field bg-base-100/50 p-3"><dt className="text-xs text-base-content/50">{k}</dt><dd className="font-mono">{v}</dd></div>
          ))}
        </dl>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[['Match', `${r.fixture.home.name} vs ${r.fixture.away.name}`], ['Kick-off', formatDateTime(r.fixture.kickoff)],
            ['Home / Draw / Away', `${pct(r.prediction.probabilities.home)} / ${pct(r.prediction.probabilities.draw)} / ${pct(r.prediction.probabilities.away)}`],
            ['xG', `${r.prediction.expectedGoals.home} – ${r.prediction.expectedGoals.away}`], ['Over 2.5', pct(r.prediction.markets.over25)],
            ['Confidence', r.prediction.confidence], ['Result', r.settled ? `${r.fixture.goals.home}–${r.fixture.goals.away}` : 'Not played yet'], ['Model', r.model.name]].map(([k, v]) => (
            <div key={k} className="rounded-field bg-base-100/50 p-3"><dt className="text-xs text-base-content/50">{k}</dt><dd className="font-mono">{v}</dd></div>
          ))}
        </dl>
      )}
    </Modal>
  );
}

export default function Predictions() {
  useDocumentTitle('Predictions');
  const [openId, setOpenId] = useState(null);
  const { query, setQuery, data, loading, error } = usePagedQuery(predictionsApi.list);
  const columns = [
    { key: 'when', header: 'When', render: (p) => <span className="whitespace-nowrap">{formatDateTime(p.createdAt)}</span> },
    { key: 'what', header: 'Prediction', render: (p) => <Summary p={p} /> },
    { key: 'user', header: 'Customer', render: (p) => <UserCell user={p.user} />, hideOnMobile: true },
  ];
  return (
    <>
      <PageHeader title="Predictions" subtitle="Every forecast customers have run." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={query.q || ''} onChange={(q) => setQuery({ q })} placeholder="Ticker, team or customer" />
        <Select value={query.type} onChange={(type) => setQuery({ type })} label="Type" options={[{ value: '', label: 'All types' }, { value: 'stock', label: 'Stocks' }, { value: 'sports', label: 'Sports' }]} />
      </div>
      <DataTable columns={columns} rows={data?.items} loading={loading} error={error} onRowClick={(p) => setOpenId(p.id)}
        empty={<EmptyState icon={Sparkles} title="No predictions yet" />} />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={(page) => setQuery({ page })} />
      <Detail id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
