/**
 * Creates Paystack plans for every active paid plan that doesn't have one yet.
 * Checkout also does this on demand; this script lets you do it up front.
 *
 *   npm run paystack:sync
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Plan } from '../src/models/index.js';
import { ensurePaystackPlan } from '../src/services/billing.service.js';
import { paystackEnabled } from '../src/services/paystack.client.js';

async function run() {
  if (!paystackEnabled()) throw new Error('Set PAYSTACK_SECRET_KEY in .env first');
  await connectDB();
  const plans = await Plan.find({ isActive: true, price: { $gt: 0 } }).sort({ sortOrder: 1 });
  for (const plan of plans) {
    const had = plan.paystackPlanCode;
    const code = await ensurePaystackPlan(plan);
    console.log(`${had ? 'exists ' : 'created'}  ${plan.slug} → ${code}`);
  }
  await disconnectDB();
}

run().catch(async (err) => {
  console.error(`Error: ${err.message}`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
