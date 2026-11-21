import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig';

export function LogoMark({ className = 'size-8' }) {
  // Unique per instance: a shared id breaks when the first copy sits in a hidden element.
  const gradientId = `logo-g-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-primary)" />
          <stop offset="1" stopColor="var(--color-secondary)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" className="fill-base-300" />
      <path d="M6 22l6-7 5 4 9-11" fill="none" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Uses the uploaded logo from site config when present, otherwise mark + site name. */
export default function Logo({ to = '/', isDark = true, className = '' }) {
  const { siteName, logo, logoDark } = useSiteConfig();
  const image = isDark ? logoDark?.url || logo?.url : logo?.url;

  return (
    <Link to={to} className={`flex items-center gap-2.5 ${className}`} aria-label={`${siteName} home`}>
      {image ? (
        <img src={image} alt={siteName} className="h-8 w-auto" />
      ) : (
        <>
          <LogoMark />
          <span className="font-display text-lg font-bold tracking-tight">{siteName}</span>
        </>
      )}
    </Link>
  );
}
