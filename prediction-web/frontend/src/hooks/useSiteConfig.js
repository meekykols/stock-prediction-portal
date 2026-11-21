import { useMemo } from 'react';
import { useSelector } from 'react-redux';

// Fallbacks so every component can render before /site-config arrives.
const DEFAULTS = {
  siteName: 'Prediction Web',
  tagline: 'AI-powered market and sports predictions',
  description: '',
  logo: null,
  logoDark: null,
  favicon: null,
  contact: {},
  socials: {},
  currency: { code: 'NGN', symbol: '₦', locale: 'en-NG' },
  seo: {},
  legal: {},
  announcement: { enabled: false },
  maintenanceMode: false,
};

const NESTED = ['contact', 'socials', 'currency', 'seo', 'legal', 'announcement'];

/** The single source for site name, contact details, socials, currency and legal text. */
export function useSiteConfig() {
  const data = useSelector((s) => s.siteConfig.data);
  return useMemo(() => {
    if (!data) return DEFAULTS;
    const merged = { ...DEFAULTS, ...data };
    for (const key of NESTED) merged[key] = { ...DEFAULTS[key], ...(data[key] || {}) };
    return merged;
  }, [data]);
}
