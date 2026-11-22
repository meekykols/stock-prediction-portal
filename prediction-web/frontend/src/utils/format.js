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

/** Decimals that suit the price: 2 for $342, 4 for EUR/USD 1.0970, 6–8 for very cheap coins. */
export function priceDigits(reference) {
  const v = Math.abs(Number(reference) || 0);
  if (v >= 100) return 2;
  if (v >= 1) return 4;
  if (v >= 0.01) return 6;
  return 8;
}

export function formatPrice(value, currency, reference = value, locale = 'en-US') {
  if (value === null || value === undefined) return '—';
  const digits = priceDigits(reference);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: currency || 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return Number(value).toFixed(digits);
  }
}

/** Axis labels: 125K, 61,240, 1,385, 342.5, 1.097, 0.0551 */
export function axisNumber(v, reference) {
  const ref = Math.abs(Number(reference) || Math.abs(v));
  // Compact only for big numbers; "1.4K" would hide moves in a USD/NGN or gold chart.
  if (ref >= 100000) return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  if (ref >= 1000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);
  // parseFloat trims trailing zeros: 0.035 rather than 0.035000
  return String(parseFloat(Number(v).toFixed(Math.max(0, priceDigits(ref) - (ref >= 100 ? 2 : 0)))));
}

export const ASSET_CLASSES = [
  { value: 'stock', label: 'Stocks', single: 'Stock', placeholder: 'Ticker, e.g. AAPL or MTNN.LG' },
  { value: 'forex', label: 'Forex', single: 'Forex', placeholder: 'Currency pair, e.g. EUR/USD' },
  { value: 'commodity', label: 'Commodities', single: 'Commodity', placeholder: 'e.g. Gold, Crude oil, Cocoa' },
  { value: 'crypto', label: 'Crypto', single: 'Crypto', placeholder: 'Coin, e.g. BTC or ETH' },
];
export const assetLabel = (v) => ASSET_CLASSES.find((a) => a.value === v)?.single ?? 'Market';

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
