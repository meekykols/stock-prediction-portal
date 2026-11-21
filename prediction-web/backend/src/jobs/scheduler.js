import cron from 'node-cron';
import { expireLapsedSubscriptions } from '../services/subscription.service.js';

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

  return () => expireJob.stop();
}
