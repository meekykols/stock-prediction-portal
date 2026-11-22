import { Plan, Subscription, SUBSCRIPTION_STATUS } from '../models/index.js';

const { ACTIVE, NON_RENEWING, EXPIRED } = SUBSCRIPTION_STATUS;

// Auto-renewing subscriptions keep access for a day past `endsAt`, so a renewal
// charge that lands a few hours late never locks a paying customer out.
export const RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000;

/** Mongo filter for subscriptions that currently grant access. */
export function liveSubscriptionFilter(now = new Date()) {
  return {
    $or: [
      { status: ACTIVE, endsAt: { $gt: new Date(now.getTime() - RENEWAL_GRACE_MS) } },
      { status: NON_RENEWING, endsAt: { $gt: now } },
    ],
  };
}

export function getFreePlan() {
  return Plan.findOne({ price: 0, isActive: true }).sort({ sortOrder: 1 });
}

export function getLiveSubscription(userId) {
  return Subscription.findOne({ user: userId, ...liveSubscriptionFilter() })
    .sort({ endsAt: -1 })
    .populate('plan');
}

/**
 * The plan a user is entitled to right now: their live paid subscription,
 * or the free plan when they have none.
 */
export async function getCurrentEntitlement(userId) {
  const subscription = await getLiveSubscription(userId);
  if (subscription?.plan) {
    return { plan: subscription.plan, status: subscription.status, endsAt: subscription.endsAt, subscription };
  }
  const freePlan = await getFreePlan();
  return { plan: freePlan, status: 'free', endsAt: null, subscription: null };
}

export function listUserSubscriptions(userId) {
  return Subscription.find({ user: userId, status: { $ne: SUBSCRIPTION_STATUS.PENDING } })
    .sort({ createdAt: -1 })
    .populate('plan')
    .limit(50);
}

/** Called by the scheduler. Marks lapsed subscriptions as expired. */
export async function expireLapsedSubscriptions(now = new Date()) {
  const result = await Subscription.updateMany(
    {
      $or: [
        { status: ACTIVE, endsAt: { $lte: new Date(now.getTime() - RENEWAL_GRACE_MS) } },
        { status: NON_RENEWING, endsAt: { $lte: now } },
      ],
    },
    { status: EXPIRED },
  );
  return result.modifiedCount;
}
