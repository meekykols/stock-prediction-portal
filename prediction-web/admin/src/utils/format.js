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
