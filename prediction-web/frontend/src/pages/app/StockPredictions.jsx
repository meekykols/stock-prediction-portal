import { CandlestickChart, Search } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function StockPredictions() {
  useDocumentTitle('Stock predictions');
  return (
    <>
      <PageHeader title="Stock predictions" subtitle="Forecast a ticker with our LSTM model." />
      <div className="glass-card p-5">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
          <label className="input w-full font-mono uppercase">
            <Search className="size-4 opacity-50" />
            <input placeholder="Ticker, e.g. AAPL" disabled aria-label="Ticker symbol" />
          </label>
          <button type="submit" className="btn btn-primary" disabled>Predict</button>
        </form>
      </div>
      <div className="mt-8">
        <EmptyState icon={CandlestickChart} title="The prediction engine is being connected">
          Interactive price charts, 100/200-day moving averages and accuracy metrics will appear here once the model service goes live.
        </EmptyState>
      </div>
    </>
  );
}
