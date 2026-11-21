// Amounts are stored in the smallest currency unit (kobo for NGN), as Paystack expects.
export const toMinor = (major) => Math.round(Number(major) * 100);
export const toMajor = (minor) => Number(minor) / 100;

export function formatMoney(minor, currency = 'NGN', locale = 'en-NG') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(toMajor(minor));
}
