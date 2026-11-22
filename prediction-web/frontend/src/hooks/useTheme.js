import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pw-theme';
export const THEMES = { dark: 'nebula', light: 'aurora' };

function read() {
  try { return localStorage.getItem(STORAGE_KEY) || 'system'; } catch { return 'system'; }
}

const resolve = (mode) =>
  mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? THEMES.light : THEMES.dark)
    : THEMES[mode] || THEMES.dark;

/** mode: 'dark' | 'light' | 'system' */
export function useTheme() {
  const [mode, setModeState] = useState(read);
  const [resolved, setResolved] = useState(() => resolve(read()));

  useEffect(() => {
    const apply = () => {
      const theme = resolve(mode);
      document.documentElement.setAttribute('data-theme', theme);
      setResolved(theme);
    };
    apply();
    if (mode !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const setMode = useCallback((next) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
    setModeState(next);
  }, []);

  return { mode, setMode, isDark: resolved === THEMES.dark };
}
