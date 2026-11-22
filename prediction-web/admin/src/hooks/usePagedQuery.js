import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';

/**
 * List pages keep their filters in the URL (shareable, survives refresh).
 * `fetcher(params)` must resolve to { items, total, page, pages }.
 */
export function usePagedQuery(fetcher, defaults = {}) {
  const [params, setParams] = useSearchParams();
  const query = { ...defaults, ...Object.fromEntries(params.entries()) };
  const key = params.toString();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchRef.current({ ...defaults, ...Object.fromEntries(new URLSearchParams(key).entries()) })
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: errorMessage(err) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { load(); }, [load]);

  const setQuery = useCallback((patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === undefined || v === null) next.delete(k); else next.set(k, String(v));
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { query, setQuery, reload: load, ...state };
}
