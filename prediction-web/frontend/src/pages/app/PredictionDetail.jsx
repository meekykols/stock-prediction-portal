import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import StockResult from '../../components/predictions/StockResult';
import SportsResult from '../../components/predictions/SportsResult';
import { predictionsApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDateTime } from '../../utils/format';

export default function PredictionDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    setState({ status: 'loading' });
    predictionsApi.get(id)
      .then((prediction) => setState({ status: 'ready', prediction }))
      .catch((err) => setState({ status: 'error', message: errorMessage(err) }));
  }, [id]);

  const p = state.prediction;
  const title = p ? (p.type === 'stock' ? `${p.summary.ticker} forecast` : `${p.summary.home} vs ${p.summary.away}`) : 'Prediction';
  useDocumentTitle(title);
  const back = p?.type === 'sports' ? '/app/sports' : p?.type === 'stock' ? '/app/stocks' : '/app/history';

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={back} className="btn btn-ghost btn-sm gap-2"><ArrowLeft className="size-4" /> Back</Link>
        {p && <span className="text-xs text-base-content/50">Generated {formatDateTime(p.createdAt)}</span>}
      </div>
      {state.status === 'loading' && (
        <div className="space-y-6"><div className="skeleton h-36 rounded-box" /><div className="skeleton h-96 rounded-box" /></div>
      )}
      {state.status === 'error' && (
        <EmptyState icon={SearchX} title="Prediction unavailable" action={<Link to="/app/history" className="btn btn-primary btn-sm">View history</Link>}>{state.message}</EmptyState>
      )}
      {state.status === 'ready' && (p.type === 'stock' ? <StockResult result={p.result} /> : <SportsResult result={p.result} />)}
    </>
  );
}
