import { useCallback, useEffect, useState } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import PredictionList from '../../components/predictions/PredictionList';
import { predictionsApi } from '../../api/endpoints';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'stock', label: 'Stocks' },
  { value: 'sports', label: 'Sports' },
];

export default function History() {
  useDocumentTitle('History');
  const [type, setType] = useState('');
  const [data, setData] = useState({ items: [], page: 0, pages: 1, loading: true });

  const load = useCallback((page, replace) => {
    setData((d) => ({ ...d, loading: true }));
    predictionsApi.list({ type: type || undefined, page, limit: 20 })
      .then((res) => setData((d) => ({ items: replace ? res.items : [...d.items, ...res.items], page: res.page, pages: res.pages, loading: false })))
      .catch(() => setData((d) => ({ ...d, loading: false })));
  }, [type]);

  useEffect(() => { load(1, true); }, [load]);

  return (
    <>
      <PageHeader title="Prediction history" subtitle="Every forecast you've run, newest first." />
      <div role="tablist" className="tabs tabs-box mb-6 w-fit">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" role="tab" className={`tab ${type === f.value ? 'tab-active' : ''}`} onClick={() => setType(f.value)}>{f.label}</button>
        ))}
      </div>
      {data.loading && data.items.length === 0 ? (
        <div className="skeleton h-64 rounded-box" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="Nothing here yet">Predictions you run will be saved here.</EmptyState>
      ) : (
        <>
          <PredictionList items={data.items} />
          {data.page < data.pages && (
            <div className="mt-6 text-center">
              <button type="button" className="btn btn-ghost border-base-content/10" onClick={() => load(data.page + 1, false)} disabled={data.loading}>
                {data.loading && <span className="loading loading-spinner loading-sm" />} Load more
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
