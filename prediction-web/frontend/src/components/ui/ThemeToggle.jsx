import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ isDark, setMode }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-circle btn-sm"
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
