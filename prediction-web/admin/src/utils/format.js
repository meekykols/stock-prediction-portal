export function formatMoney(minor, currency = 'NGN', locale = 'en-NG') {
  const major = Number(minor || 0) / 100;
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: major % 1 === 0 ? 0 : 2 }).format(major);
}
export const compactMoney = (minor, currency = 'NGN', locale = 'en-NG') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(Number(minor || 0) / 100);
export const formatDate = (v) => (v ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(v)) : '—');
export const formatDateTime = (v) => (v ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '—');
export const fullName = (u) => (u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '—');
export const initials = (u) => `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase() || '?';
export const INTERVAL = { monthly: 'month', quarterly: 'quarter', annually: 'year' };
export const ASSET_LABEL = { stock: 'Stock', forex: 'Forex', commodity: 'Commodity', crypto: 'Crypto' };
/** Price with precision that suits its size (EUR/USD 1.0970, BTC 60,924.13, DOGE 0.055150). */
export function formatPrice(v, reference = v) {
  if (v === null || v === undefined) return '—';
  const r = Math.abs(Number(reference) || 0);
  const digits = r >= 100 ? 2 : r >= 1 ? 4 : r >= 0.01 ? 6 : 8;
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
