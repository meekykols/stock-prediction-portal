import { useEffect } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig';

/** Pushes site config into <head>: meta description and favicon. */
export default function SiteMeta() {
  const { seo, description, tagline, favicon } = useSiteConfig();

  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', seo.description || description || tagline || '');
  }, [seo.description, description, tagline]);

  useEffect(() => {
    if (favicon?.url) document.getElementById('favicon')?.setAttribute('href', favicon.url);
  }, [favicon?.url]);

  return null;
}
