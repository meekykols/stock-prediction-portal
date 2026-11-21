import cron from 'node-cron';
import { expireLapsedSubscriptions } from '../services/subscription.service.js';
import { abandonStalePayments } from '../services/billing.service.js';

export function startScheduler() {
  // Every 15 minutes: lapse subscriptions past their end date.
  const expireJob = cron.schedule('*/15 * * * *', async () => {
    try {
      const count = await expireLapsedSubscriptions();
      if (count) console.log(`[scheduler] expired ${count} subscription(s)`);
    } catch (err) {
      console.error('[scheduler] expire job failed', err);
    }
  });

  // Hourly: close checkouts that were never completed.
  const abandonJob = cron.schedule('7 * * * *', async () => {
    try {
      const count = await abandonStalePayments();
      if (count) console.log(`[scheduler] marked ${count} checkout(s) abandoned`);
    } catch (err) {
      console.error('[scheduler] abandon job failed', err);
    }
  });

  return () => {
    expireJob.stop();
    abandonJob.stop();
  };
}
