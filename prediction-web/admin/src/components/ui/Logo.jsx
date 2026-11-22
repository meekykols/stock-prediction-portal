import { useId } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig';

export function LogoMark({ className = 'size-8' }) {
  const id = `alg-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-primary)" />
          <stop offset="1" stopColor="var(--color-secondary)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" className="fill-base-300" />
      <path d="M6 22l6-7 5 4 9-11" fill="none" stroke={`url(#${id})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ isDark = true }) {
  const { siteName, logo, logoDark } = useSiteConfig();
  const image = isDark ? logoDark?.url || logo?.url : logo?.url;
  return (
    <div className="flex items-center gap-2.5">
      {image ? <img src={image} alt={siteName} className="h-7 w-auto" /> : <LogoMark />}
      <div className="leading-tight">
        {!image && <p className="font-display font-bold">{siteName}</p>}
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Admin</p>
      </div>
    </div>
  );
}
