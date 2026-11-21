const MONTHS = { monthly: 1, quarterly: 3, annually: 12 };

/** Adds one billing interval, clamping to month end (31 Jan + 1 month = 28/29 Feb). */
export function addInterval(date, interval) {
  const months = MONTHS[interval];
  if (!months) throw new Error(`Unknown interval: ${interval}`);
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** A renewal extends from the later of the current end date and the payment date. */
export function renewalEndsAt(currentEndsAt, paidAt, interval) {
  const base = currentEndsAt && currentEndsAt > paidAt ? currentEndsAt : paidAt;
  return addInterval(base, interval);
}
