import { useCallback, useEffect, useState } from 'react';

const KEY = 'pw-admin-theme';
const read = () => { try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; } };
const resolve = (m) => (m === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'aurora' : 'nebula') : m === 'light' ? 'aurora' : 'nebula');

export function useTheme() {
  const [mode, setModeState] = useState(read);
  const [theme, setTheme] = useState(() => resolve(read()));
  useEffect(() => {
    const apply = () => { const t = resolve(mode); document.documentElement.setAttribute('data-theme', t); setTheme(t); };
    apply();
    if (mode !== 'system') return undefined;
    const mq = matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
  const setMode = useCallback((m) => { try { localStorage.setItem(KEY, m); } catch { /* ignore */ } setModeState(m); }, []);
  return { mode, setMode, isDark: theme === 'nebula' };
}
