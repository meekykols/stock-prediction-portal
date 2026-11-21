import { Plan, Subscription, SUBSCRIPTION_STATUS } from '../models/index.js';

const LIVE_STATUSES = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.NON_RENEWING];

export function getFreePlan() {
  return Plan.findOne({ price: 0, isActive: true }).sort({ sortOrder: 1 });
}

/**
 * The plan a user is entitled to right now: their live paid subscription,
 * or the free plan when they have none.
 */
export async function getCurrentEntitlement(userId) {
  const subscription = await Subscription.findOne({
    user: userId,
    status: { $in: LIVE_STATUSES },
    endsAt: { $gt: new Date() },
  })
    .sort({ endsAt: -1 })
    .populate('plan');

  if (subscription?.plan) {
    return {
      plan: subscription.plan,
      status: subscription.status,
      endsAt: subscription.endsAt,
      subscription,
    };
  }

  const freePlan = await getFreePlan();
  return { plan: freePlan, status: 'free', endsAt: null, subscription: null };
}

export function listUserSubscriptions(userId) {
  return Subscription.find({ user: userId }).sort({ createdAt: -1 }).populate('plan').limit(50);
}

/** Called by the scheduler. Marks lapsed subscriptions as expired. */
export async function expireLapsedSubscriptions() {
  const result = await Subscription.updateMany(
    { status: { $in: LIVE_STATUSES }, endsAt: { $lte: new Date() } },
    { status: SUBSCRIPTION_STATUS.EXPIRED },
  );
  return result.modifiedCount;
}
