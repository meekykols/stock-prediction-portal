export function formatMoney(minor, currency = 'NGN', locale = 'en-NG') {
  const major = Number(minor || 0) / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}

export const INTERVAL_LABEL = { monthly: '/month', quarterly: '/quarter', annually: '/year' };

export const formatLimit = (n) => (n === -1 ? 'Unlimited' : String(n));

export function formatDate(value, locale = 'en-NG') {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

export const initials = (user) =>
  `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '?';

export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;
export const waHref = (phone) => `https://wa.me/${String(phone).replace(/\D/g, '')}`;

export function formatPrice(value, currency, locale = 'en-US') {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(value);
  } catch {
    return Number(value).toFixed(2);
  }
}

export const formatPct = (value, digits = 1) =>
  value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${Number(value).toFixed(digits)}%`;

export const formatProb = (p) => `${Math.round((p || 0) * 100)}%`;

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
