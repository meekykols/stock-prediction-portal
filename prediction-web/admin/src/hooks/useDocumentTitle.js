import { useEffect } from 'react';
import { useSiteConfig } from './useSiteConfig';

export function useDocumentTitle(title) {
  const { siteName } = useSiteConfig();
  useEffect(() => {
    document.title = `${title ? `${title} · ` : ''}${siteName} Admin`;
  }, [title, siteName]);
}
