import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import StockResult from '../../components/predictions/StockResult';
import SportsResult from '../../components/predictions/SportsResult';
import { signalsApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDate } from '../../utils/format';

export default function SignalDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  useDocumentTitle(state.signal?.title || 'Signal');

  useEffect(() => {
    signalsApi.get(id)
      .then((signal) => setState({ status: 'ready', signal }))
      .catch((err) => setState({ status: 'error', message: errorMessage(err), code: err?.response?.data?.code }));
  }, [id]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/app/signals" className="btn btn-ghost btn-sm gap-2"><ArrowLeft className="size-4" /> Signals</Link>
        {state.signal && <span className="text-xs text-base-content/50">Published {formatDate(state.signal.runDate)}</span>}
      </div>
      {state.status === 'loading' && <div className="space-y-6"><div className="skeleton h-36 rounded-box" /><div className="skeleton h-96 rounded-box" /></div>}
      {state.status === 'error' && (
        <EmptyState icon={Lock} title={state.code === 'premium_required' ? 'Premium signal' : 'Signal unavailable'}
          action={state.code === 'premium_required' && <Link to="/app/billing?plan=pro" className="btn btn-primary btn-sm">Upgrade</Link>}>
          {state.message}
        </EmptyState>
      )}
      {state.status === 'ready' && (state.signal.type === 'stock' ? <StockResult result={state.signal.result} /> : <SportsResult result={state.signal.result} />)}
    </>
  );
}
