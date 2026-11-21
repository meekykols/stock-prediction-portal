import { useCallback, useEffect, useState } from 'react';
import { predictionsApi } from '../api/endpoints';

export function usePredictionUsage() {
  const [usage, setUsage] = useState(null);
  const refresh = useCallback(() => predictionsApi.usage().then(setUsage).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);
  return { usage, refresh };
}
