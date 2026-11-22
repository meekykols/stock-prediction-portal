import cron from 'node-cron';
import { expireLapsedSubscriptions } from '../services/subscription.service.js';
import { abandonStalePayments } from '../services/billing.service.js';
import { runMarketSignals, runSportsSignals } from '../services/signals.service.js';
import { generateTips, settleTips } from '../services/tips.service.js';
import { endExpiredPromos } from '../services/contest.service.js';

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
    // Daily 21:30 UTC, after the US close: all markets on weekdays, crypto only at weekends.
    cron.schedule('30 21 * * *', safely('market-signals', () => runMarketSignals()), utc),
    // Daily 06:00 UTC: sports signals for today's fixtures.
    cron.schedule('0 6 * * *', safely('sports-signals', () => runSportsSignals()), utc),
    // 05:00 and 15:00 UTC: tips for today and tomorrow (the afternoon run picks up late fixtures
    // and refreshes unstarted tips with the latest results).
    cron.schedule('0 5,15 * * *', safely('sports-tips', () => generateTips()), utc),
    // Hourly at :20: settle tips whose events should have finished.
    cron.schedule('20 * * * *', safely('tips-settle', () => settleTips()), utc),
    // Hourly: take down adverts past their end date.
    cron.schedule('3 * * * *', safely('promos', async () => {
      const n = await endExpiredPromos();
      if (n) console.log(`[scheduler] ended ${n} advert(s)`);
    }), utc),
  ];
  return () => jobs.forEach((j) => j.stop());
}
