import { useEffect } from 'react';
import { useSiteConfig } from './useSiteConfig';

export function useDocumentTitle(title) {
  const { siteName, tagline, seo } = useSiteConfig();
  useEffect(() => {
    document.title = title ? `${title} · ${siteName}` : seo.title || `${siteName} — ${tagline}`;
  }, [title, siteName, tagline, seo.title]);
}
