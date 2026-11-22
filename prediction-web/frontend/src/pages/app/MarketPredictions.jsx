import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bitcoin, CandlestickChart, Coins, Gem, Search, Sparkles } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import UsageMeter from '../../components/predictions/UsageMeter';
import PredictionList from '../../components/predictions/PredictionList';
import { predictionsApi } from '../../api/endpoints';
import { fieldErrors } from '../../api/client';
import { usePredictionUsage } from '../../hooks/usePredictionUsage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ASSET_CLASSES } from '../../utils/format';
import { toastPredictionError } from '../../utils/predictionErrors';

const ICONS = { stock: CandlestickChart, forex: Coins, commodity: Gem, crypto: Bitcoin };
const HORIZONS = [3, 5, 7, 14];
const NOTES = {
  stock: 'Any Yahoo Finance ticker. Nigerian stocks end in .LG (e.g. MTNN.LG).',
  forex: 'Any pair of three-letter currency codes, e.g. EUR/USD, GBPJPY or USD/NGN.',
  commodity: 'Futures prices for the commodities listed below.',
  crypto: 'Priced in US dollars. Crypto trades every day, so forecasts include weekends.',
};

export default function MarketPredictions() {
  useDocumentTitle('Market predictions');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const assetClass = ASSET_CLASSES.some((a) => a.value === params.get('class')) ? params.get('class') : 'stock';
  const meta = ASSET_CLASSES.find((a) => a.value === assetClass);
  const { usage } = usePredictionUsage();
  const [catalog, setCatalog] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [horizon, setHorizon] = useState(7);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(null);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    predictionsApi.catalog().then(setCatalog).catch(() => setCatalog({}));
    predictionsApi.list({ type: 'market', limit: 8 }).then((d) => setRecent(d.items)).catch(() => setRecent([]));
  }, []);

  const switchClass = (value) => {
    setParams({ class: value }, { replace: true });
    setSymbol('');
    setError('');
  };

  const run = async (raw = symbol, label = raw) => {
    const s = raw.trim();
    if (!s) { setError('Enter a symbol'); return; }
    setError('');
    setRunning(label.trim());
    try {
      const { prediction, reused } = await predictionsApi.createMarket({ assetClass, symbol: s, horizon });
      if (reused) toast(`Showing today's earlier ${prediction.summary.displayName} result. No prediction used.`, { icon: '♻️' });
      navigate(`/app/predictions/${prediction.id}`);
    } catch (err) {
      const fields = fieldErrors(err);
      setError(fields.symbol || (err?.response?.data?.code === 'invalid_symbol' ? err.response.data.message : ''));
      toastPredictionError(err);
      setRunning(null);
    }
  };

  const suggestions = catalog?.[assetClass] ?? [];

  return (
    <>
      <PageHeader
        title="Market predictions"
        subtitle="Forecast stocks, forex, commodities and crypto with our LSTM model."
        actions={<UsageMeter usage={usage?.market} label="Today's market predictions" />}
      />

      <div role="tablist" className="tabs tabs-box mb-4 w-full overflow-x-auto sm:w-fit">
        {ASSET_CLASSES.map(({ value, label }) => {
          const Icon = ICONS[value];
          return (
            <button key={value} type="button" role="tab" aria-selected={assetClass === value} onClick={() => switchClass(value)}
              className={`tab gap-2 whitespace-nowrap ${assetClass === value ? 'tab-active' : ''}`} disabled={Boolean(running)}>
              <Icon className="size-4" /> {label}
            </button>
          );
        })}
      </div>

      <form className="glass-card p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); run(); }} noValidate>
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className={`input input-lg w-full font-mono ${error ? 'input-error' : ''}`}>
            <Search className="size-5 opacity-50" />
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder={meta.placeholder}
              aria-label={`${meta.single} symbol`}
              aria-invalid={Boolean(error)}
              disabled={Boolean(running)}
              autoFocus
            />
          </label>
          <select className="select select-lg w-full lg:w-44" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} disabled={Boolean(running)} aria-label="Forecast horizon">
            {HORIZONS.map((h) => <option key={h} value={h}>{h}-day outlook</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-lg" disabled={Boolean(running)}>
            {running ? <span className="loading loading-spinner" /> : <Sparkles className="size-5" />} Predict
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-error">{error}</p> : <p className="mt-2 text-xs text-base-content/50">{NOTES[assetClass]}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-base-content/50">Popular:</span>
          {catalog === null && <span className="loading loading-dots loading-xs" />}
          {suggestions.map((s) => (
            <button key={s.symbol} type="button" title={s.name} onClick={() => run(s.symbol)} disabled={Boolean(running)}
              className="btn btn-xs btn-ghost rounded-full border border-base-content/10 font-mono">
              {s.symbol}
            </button>
          ))}
        </div>
      </form>

      {running && (
        <div className="glass-card mt-6 flex items-center gap-4 p-6">
          <span className="loading loading-bars loading-md text-primary" />
          <div>
            <p className="font-medium">Running the model on {running}…</p>
            <p className="text-sm text-base-content/60">Fetching up to 10 years of daily prices and backtesting. This usually takes a few seconds.</p>
          </div>
        </div>
      )}

      <h2 className="mb-4 mt-10 text-lg font-semibold">Your recent market predictions</h2>
      {recent === null ? (
        <div className="skeleton h-40 rounded-box" />
      ) : recent.length ? (
        <PredictionList items={recent} />
      ) : (
        <EmptyState icon={CandlestickChart} title="No market predictions yet">
          Pick a market above. Results include charts, a backtest and accuracy metrics.
        </EmptyState>
      )}
    </>
  );
}
