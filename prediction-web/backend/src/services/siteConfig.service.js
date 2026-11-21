import { SiteConfig } from '../models/index.js';

const CACHE_TTL_MS = 60 * 1000;
let cache = { value: null, at: 0 };

export async function getSiteConfig({ fresh = false } = {}) {
  if (!fresh && cache.value && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const doc = await SiteConfig.getSingleton();
  cache = { value: doc.toJSON(), at: Date.now() };
  return cache.value;
}

const EDITABLE = [
  'siteName', 'tagline', 'description', 'contact', 'socials', 'currency',
  'seo', 'legal', 'announcement', 'maintenanceMode',
];

export async function updateSiteConfig(patch) {
  const doc = await SiteConfig.getSingleton();
  for (const key of EDITABLE) {
    if (patch[key] === undefined) continue;
    const current = doc[key];
    const isNested = current && typeof current === 'object' && typeof patch[key] === 'object'
      && !Array.isArray(patch[key]);
    doc.set(key, isNested ? { ...current.toObject?.() ?? current, ...patch[key] } : patch[key]);
  }
  await doc.save();
  cache = { value: null, at: 0 };
  return getSiteConfig({ fresh: true });
}

export async function setSiteImage(field, image) {
  const doc = await SiteConfig.getSingleton();
  const previous = doc[field]?.publicId;
  doc.set(field, image);
  await doc.save();
  cache = { value: null, at: 0 };
  return { config: await getSiteConfig({ fresh: true }), previousPublicId: previous };
}
