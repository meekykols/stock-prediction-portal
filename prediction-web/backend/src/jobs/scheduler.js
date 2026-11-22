import cron from 'node-cron';
import { expireLapsedSubscriptions } from '../services/subscription.service.js';
import { abandonStalePayments } from '../services/billing.service.js';
import { runSportsSignals, runStockSignals } from '../services/signals.service.js';

/**
 * Run on exactly one instance in production (set RUN_SCHEDULER=false on the others),
 * otherwise each instance would run the same jobs.
 */
function safely(name, fn) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[scheduler] ${name} failed:`, err.message);
    }
  };
}

export function startScheduler() {
  if (process.env.RUN_SCHEDULER === 'false') {
    console.log('[scheduler] disabled on this instance (RUN_SCHEDULER=false)');
    return () => {};
  }
  const utc = { timezone: 'Etc/UTC' };
  const jobs = [
    // Every 15 minutes: lapse subscriptions past their end date.
    cron.schedule('*/15 * * * *', safely('expire', async () => {
      const n = await expireLapsedSubscriptions();
      if (n) console.log(`[scheduler] expired ${n} subscription(s)`);
    }), utc),
    // Hourly: close checkouts that were never completed.
    cron.schedule('7 * * * *', safely('abandon', async () => {
      const n = await abandonStalePayments();
      if (n) console.log(`[scheduler] marked ${n} checkout(s) abandoned`);
    }), utc),
    // Weekdays 21:30 UTC, after the US market close: stock signals.
    cron.schedule('30 21 * * 1-5', safely('stock-signals', () => runStockSignals()), utc),
    // Daily 06:00 UTC: sports signals for today's fixtures.
    cron.schedule('0 6 * * *', safely('sports-signals', () => runSportsSignals()), utc),
  ];
  return () => jobs.forEach((j) => j.stop());
}
