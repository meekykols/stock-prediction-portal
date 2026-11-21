import { CheckCircle2 } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useTheme } from '../../hooks/useTheme';

const POINTS = [
  'Deep-learning stock forecasts with accuracy metrics',
  'Football predictions from form and team statistics',
  'Start free, upgrade any time',
];

export default function AuthShell({ title, subtitle, children, footer }) {
  const { siteName, tagline, legal } = useSiteConfig();
  const theme = useTheme();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-base-content/10 bg-base-200/50 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-grid absolute inset-0" />
        <div className="glow-orb -left-20 top-1/3 size-96 bg-primary/25" />
        <div className="glow-orb -right-10 bottom-0 size-80 bg-secondary/25" />
        <div className="relative"><Logo isDark={theme.isDark} /></div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight">
            <span className="text-gradient">{siteName}</span><br />{tagline}
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-base-content/80"><CheckCircle2 className="size-5 shrink-0 text-accent" />{p}</li>
            ))}
          </ul>
        </div>
        <p className="relative max-w-md text-xs text-base-content/50">{legal.disclaimer}</p>
      </aside>

      <main className="flex flex-col justify-center px-4 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 lg:hidden"><Logo isDark={theme.isDark} /></div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-base-content/60">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-base-content/60">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
