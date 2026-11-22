import { useSelector } from 'react-redux';

export function useSiteConfig() {
  const data = useSelector((s) => s.siteConfig.data);
  return {
    siteName: data?.siteName || 'Prediction Web',
    logo: data?.logo,
    logoDark: data?.logoDark,
    currency: { code: 'NGN', locale: 'en-NG', ...(data?.currency || {}) },
    contact: data?.contact || {},
  };
}
