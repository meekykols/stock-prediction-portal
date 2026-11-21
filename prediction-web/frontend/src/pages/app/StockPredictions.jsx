import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CandlestickChart, Search, Sparkles } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import UsageMeter from '../../components/predictions/UsageMeter';
import PredictionList from '../../components/predictions/PredictionList';
import { predictionsApi } from '../../api/endpoints';
import { fieldErrors } from '../../api/client';
import { usePredictionUsage } from '../../hooks/usePredictionUsage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { toastPredictionError } from '../../utils/predictionErrors';

const SUGGESTIONS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META'];
const HORIZONS = [3, 5, 7, 14];

export default function StockPredictions() {
  useDocumentTitle('Stock predictions');
  const navigate = useNavigate();
  const { usage } = usePredictionUsage();
  const [ticker, setTicker] = useState('');
  const [horizon, setHorizon] = useState(7);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    predictionsApi.list({ type: 'stock', limit: 8 }).then((d) => setRecent(d.items)).catch(() => setRecent([]));
  }, []);

  const run = async (symbol = ticker) => {
    const t = symbol.trim().toUpperCase();
    if (!t) { setError('Enter a ticker symbol'); return; }
    setTicker(t);
    setError('');
    setRunning(true);
    try {
      const { prediction, reused } = await predictionsApi.createStock({ ticker: t, horizon });
      if (reused) toast(`Showing today's earlier ${t} result. No prediction used.`, { icon: '♻️' });
      navigate(`/app/predictions/${prediction.id}`);
    } catch (err) {
      setError(fieldErrors(err).ticker || '');
      toastPredictionError(err);
      setRunning(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Stock predictions"
        subtitle="Forecast any Yahoo Finance ticker with our LSTM model."
        actions={<UsageMeter usage={usage?.stock} label="Today's stock predictions" />}
      />

      <form className="glass-card p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); run(); }} noValidate>
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className={`input input-lg w-full font-mono ${error ? 'input-error' : ''}`}>
            <Search className="size-5 opacity-50" />
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Ticker, e.g. AAPL, MTNN.LG, BTC-USD"
              aria-label="Ticker symbol"
              aria-invalid={Boolean(error)}
              disabled={running}
              autoFocus
            />
          </label>
          <select className="select select-lg w-full lg:w-44" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} disabled={running} aria-label="Forecast horizon">
            {HORIZONS.map((h) => <option key={h} value={h}>{h}-day outlook</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-lg" disabled={running}>
            {running ? <span className="loading loading-spinner" /> : <Sparkles className="size-5" />} Predict
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-base-content/50">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="btn btn-xs btn-ghost rounded-full border border-base-content/10 font-mono" onClick={() => run(s)} disabled={running}>{s}</button>
          ))}
        </div>
      </form>

      {running && (
        <div className="glass-card mt-6 flex items-center gap-4 p-6">
          <span className="loading loading-bars loading-md text-primary" />
          <div>
            <p className="font-medium">Running the model on {ticker}…</p>
            <p className="text-sm text-base-content/60">Fetching 10 years of prices and backtesting. This usually takes a few seconds.</p>
          </div>
        </div>
      )}

      <h2 className="mt-10 mb-4 text-lg font-semibold">Your recent stock predictions</h2>
      {recent === null ? (
        <div className="skeleton h-40 rounded-box" />
      ) : recent.length ? (
        <PredictionList items={recent} />
      ) : (
        <EmptyState icon={CandlestickChart} title="No stock predictions yet">
          Enter a ticker above. Results include charts, a backtest and accuracy metrics.
        </EmptyState>
      )}
    </>
  );
}
