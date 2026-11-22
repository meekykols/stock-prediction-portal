import crypto from 'node:crypto';
import {
  Payment, PAYMENT_STATUS, Plan, Subscription, SUBSCRIPTION_STATUS, User,
} from '../models/index.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { addInterval, renewalEndsAt } from '../utils/billingPeriod.js';
import { paystack, paystackEnabled } from './paystack.client.js';
import { getLiveSubscription } from './subscription.service.js';

const { ACTIVE, NON_RENEWING, CANCELLED } = SUBSCRIPTION_STATUS;

const newReference = () => `pw_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;

/** Paystack plans are created on demand and cached on our Plan document. */
export async function ensurePaystackPlan(plan) {
  if (plan.paystackPlanCode) return plan.paystackPlanCode;
  const created = await paystack.createPlan({
    name: `${plan.name} (${plan.interval})`,
    amount: plan.price,
    interval: plan.interval,
    currency: plan.currency,
  });
  // Only set it if nobody else did in the meantime.
  const updated = await Plan.findOneAndUpdate(
    { _id: plan._id, $or: [{ paystackPlanCode: null }, { paystackPlanCode: { $exists: false } }, { paystackPlanCode: '' }] },
    { paystackPlanCode: created.plan_code },
    { returnDocument: 'after' },
  );
  return updated?.paystackPlanCode ?? (await Plan.findById(plan._id)).paystackPlanCode;
}

// ---------------------------------------------------------------- checkout

export async function startCheckout(user, planSlug) {
  const plan = await Plan.findOne({ slug: planSlug, isActive: true });
  if (!plan) throw ApiError.notFound('That plan is not available');
  if (plan.price === 0) throw ApiError.badRequest('The free plan does not need a payment');

  const live = await getLiveSubscription(user._id);
  if (live && String(live.plan._id) === String(plan._id)) {
    throw new ApiError(
      409,
      live.status === NON_RENEWING
        ? 'You already have this plan. Turn auto-renew back on from your billing page instead.'
        : 'You are already on this plan.',
      undefined,
      'already_subscribed',
    );
  }

  const planCode = await ensurePaystackPlan(plan);
  const reference = newReference();
  await Payment.create({
    user: user._id, plan: plan._id, reference, amount: plan.price, currency: plan.currency, planCode, kind: 'initial',
  });

  const init = await paystack.initializeTransaction({
    email: user.email,
    amount: plan.price,
    currency: plan.currency,
    reference,
    plan: planCode,
    callbackUrl: `${env.appUrl}/app/billing/callback`,
    metadata: { userId: String(user._id), planId: String(plan._id), planSlug: plan.slug },
  });

  return { authorizationUrl: init.authorization_url, reference };
}

// ---------------------------------------------------------------- charges

const cardOf = (auth) => (auth ? { brand: auth.card_type?.trim(), last4: auth.last4, bank: auth.bank } : undefined);
const planCodeOf = (charge) => (typeof charge.plan === 'string' ? charge.plan : charge.plan?.plan_code) || charge.plan_object?.plan_code;

/** Ends other live subscriptions after a switch to a new plan. */
async function retireOtherSubscriptions(userId, keepId) {
  const others = await Subscription.find({
    user: userId, _id: { $ne: keepId }, status: { $in: [ACTIVE, NON_RENEWING] },
  });
  for (const sub of others) {
    if (sub.paystack?.subscriptionCode && sub.paystack?.emailToken && sub.status === ACTIVE) {
      try {
        await paystack.disableSubscription({ code: sub.paystack.subscriptionCode, token: sub.paystack.emailToken });
      } catch (err) {
        console.error('[billing] could not disable replaced subscription', sub.id, err.message);
      }
    }
    sub.status = CANCELLED;
    sub.cancelledAt = new Date();
    sub.cancelReason = 'replaced';
    await sub.save();
  }
}

/**
 * Applies a successful first payment: claims the Payment atomically (so the
 * callback and the webhook can both call this safely) and opens a subscription.
 */
async function applyInitialCharge(charge) {
  const pending = await Payment.findOne({ reference: charge.reference });
  if (!pending) return null;
  if (pending.status === PAYMENT_STATUS.SUCCESS) return pending;

  if (charge.amount < pending.amount || (charge.currency && charge.currency !== pending.currency)) {
    console.error('[billing] amount/currency mismatch for', charge.reference, charge.amount, charge.currency);
    await Payment.updateOne({ _id: pending._id }, { status: PAYMENT_STATUS.FAILED, gatewayResponse: 'Amount mismatch' });
    return null;
  }

  const paidAt = charge.paid_at ? new Date(charge.paid_at) : new Date();
  const claimed = await Payment.findOneAndUpdate(
    { _id: pending._id, status: { $ne: PAYMENT_STATUS.SUCCESS } },
    {
      status: PAYMENT_STATUS.SUCCESS,
      paidAt,
      channel: charge.channel,
      card: cardOf(charge.authorization),
      gatewayResponse: charge.gateway_response,
    },
    { returnDocument: 'after' },
  );
  if (!claimed) return Payment.findById(pending._id); // the other path got there first

  const plan = await Plan.findById(claimed.plan);
  const subscription = await Subscription.create({
    user: claimed.user,
    plan: plan._id,
    status: ACTIVE,
    amount: claimed.amount,
    currency: claimed.currency,
    startsAt: paidAt,
    endsAt: addInterval(paidAt, plan.interval),
    paystack: {
      reference: claimed.reference,
      planCode: claimed.planCode,
      customerCode: charge.customer?.customer_code,
      customerId: charge.customer?.id,
      authorizationCode: charge.authorization?.authorization_code,
    },
  });
  claimed.subscription = subscription._id;
  await claimed.save();
  await retireOtherSubscriptions(claimed.user, subscription._id);
  return claimed;
}

/** A recurring charge Paystack made on its own (reference we have never seen). */
async function applyRenewalCharge(charge) {
  const planCode = planCodeOf(charge);
  if (!planCode) return null;

  const user = await User.findOne({ email: charge.customer?.email?.toLowerCase() });
  if (!user) return null;

  const subscription = await Subscription.findOne({
    user: user._id, 'paystack.planCode': planCode, status: { $in: [ACTIVE, NON_RENEWING] },
  }).sort({ endsAt: -1 }).populate('plan');
  if (!subscription) {
    console.warn('[billing] renewal for unknown subscription', charge.reference, planCode);
    return null;
  }

  const paidAt = charge.paid_at ? new Date(charge.paid_at) : new Date();
  try {
    await Payment.create({
      user: user._id,
      plan: subscription.plan._id,
      subscription: subscription._id,
      reference: charge.reference,
      kind: 'renewal',
      status: PAYMENT_STATUS.SUCCESS,
      amount: charge.amount,
      currency: charge.currency,
      planCode,
      paidAt,
      channel: charge.channel,
      card: cardOf(charge.authorization),
      gatewayResponse: charge.gateway_response,
    });
  } catch (err) {
    if (err.code === 11000) return null; // webhook retried: already applied
    throw err;
  }

  subscription.endsAt = renewalEndsAt(subscription.endsAt, paidAt, subscription.plan.interval);
  subscription.status = ACTIVE;
  subscription.paymentIssueAt = undefined;
  await subscription.save();
  return subscription;
}

export async function handleChargeSuccess(charge) {
  const known = await Payment.exists({ reference: charge.reference });
  return known ? applyInitialCharge(charge) : applyRenewalCharge(charge);
}

/** Called from the Paystack redirect: confirm the payment server-side. */
export async function verifyCheckout(userId, reference) {
  const payment = await Payment.findOne({ reference, user: userId });
  if (!payment) throw ApiError.notFound('Payment not found');

  if (payment.status === PAYMENT_STATUS.PENDING) {
    const charge = await paystack.verifyTransaction(reference);
    if (charge.status === 'success') {
      await applyInitialCharge(charge);
    } else if (['failed', 'abandoned', 'reversed'].includes(charge.status)) {
      await Payment.updateOne(
        { _id: payment._id, status: PAYMENT_STATUS.PENDING },
        { status: charge.status === 'abandoned' ? PAYMENT_STATUS.ABANDONED : PAYMENT_STATUS.FAILED, gatewayResponse: charge.gateway_response },
      );
    }
  }
  return Payment.findById(payment._id).populate('plan');
}

// ---------------------------------------------------------------- subscription events

export async function handleSubscriptionCreate(data) {
  const planCode = data.plan?.plan_code;
  const user = await User.findOne({ email: data.customer?.email?.toLowerCase() });
  if (!planCode || !user) return null;

  // The payment usually lands first; if not, retry via the webhook (Paystack resends on non-2xx).
  const subscription = await Subscription.findOne({
    user: user._id, 'paystack.planCode': planCode, status: { $in: [ACTIVE, NON_RENEWING] },
    $or: [{ 'paystack.subscriptionCode': null }, { 'paystack.subscriptionCode': data.subscription_code }],
  }).sort({ createdAt: -1 });
  if (!subscription) {
    const err = new Error(`No local subscription yet for ${data.subscription_code}`);
    err.retryable = true;
    throw err;
  }

  subscription.paystack.subscriptionCode = data.subscription_code;
  subscription.paystack.emailToken = data.email_token;
  subscription.paystack.customerCode ??= data.customer?.customer_code;
  subscription.paystack.customerId ??= data.customer?.id;
  if (data.next_payment_date) subscription.endsAt = new Date(data.next_payment_date);
  await subscription.save();
  return subscription;
}

export async function handleSubscriptionNotRenewing(data) {
  return Subscription.findOneAndUpdate(
    { 'paystack.subscriptionCode': data.subscription_code, status: ACTIVE },
    { status: NON_RENEWING, cancelledAt: new Date(), cancelReason: 'provider' },
    { returnDocument: 'after' },
  );
}

export async function handleSubscriptionDisable(data) {
  const sub = await Subscription.findOne({ 'paystack.subscriptionCode': data.subscription_code });
  if (!sub || sub.status === CANCELLED) return sub;
  // Keep paid-for access until the end of the period.
  sub.status = sub.endsAt && sub.endsAt > new Date() ? NON_RENEWING : SUBSCRIPTION_STATUS.EXPIRED;
  sub.cancelledAt ??= new Date();
  sub.cancelReason ??= 'provider';
  await sub.save();
  return sub;
}

export async function handlePaymentFailed(data) {
  const code = data.subscription?.subscription_code;
  if (!code) return null;
  return Subscription.findOneAndUpdate(
    { 'paystack.subscriptionCode': code },
    { paymentIssueAt: new Date() },
    { returnDocument: 'after' },
  );
}

// ---------------------------------------------------------------- self-service

/** Fills in the Paystack subscription code/token if the webhook hasn't yet. */
async function resolveProviderSubscription(sub) {
  if (sub.paystack?.subscriptionCode && sub.paystack?.emailToken) return sub;

  if (!sub.paystack?.subscriptionCode && sub.paystack?.customerId) {
    const list = await paystack.listCustomerSubscriptions(sub.paystack.customerId);
    const match = (Array.isArray(list) ? list : [])
      .filter((s) => s.plan?.plan_code === sub.paystack.planCode && ['active', 'non-renewing', 'attention'].includes(s.status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (match) {
      sub.paystack.subscriptionCode = match.subscription_code;
      sub.paystack.emailToken = match.email_token;
    }
  }
  if (sub.paystack?.subscriptionCode && !sub.paystack.emailToken) {
    const remote = await paystack.fetchSubscription(sub.paystack.subscriptionCode);
    sub.paystack.emailToken = remote.email_token;
  }
  if (!sub.paystack?.subscriptionCode) {
    throw new ApiError(409, 'Your subscription is still being set up. Please try again in a minute.', undefined, 'subscription_pending');
  }
  await sub.save();
  return sub;
}

async function requirePaidLiveSubscription(userId) {
  const sub = await getLiveSubscription(userId);
  if (!sub || sub.plan.price === 0) throw ApiError.badRequest('You do not have a paid subscription');
  if (sub.source === 'admin') {
    throw ApiError.badRequest('This plan was added by our team and has no billing to manage.');
  }
  return sub;
}

export async function cancelAutoRenew(userId) {
  const sub = await requirePaidLiveSubscription(userId);
  if (sub.status === NON_RENEWING) return sub;
  await resolveProviderSubscription(sub);
  await paystack.disableSubscription({ code: sub.paystack.subscriptionCode, token: sub.paystack.emailToken });
  sub.status = NON_RENEWING;
  sub.cancelledAt = new Date();
  sub.cancelReason = 'user';
  await sub.save();
  return sub;
}

export async function resumeAutoRenew(userId) {
  const sub = await requirePaidLiveSubscription(userId);
  if (sub.status === ACTIVE) return sub;
  await resolveProviderSubscription(sub);
  await paystack.enableSubscription({ code: sub.paystack.subscriptionCode, token: sub.paystack.emailToken });
  sub.status = ACTIVE;
  sub.cancelledAt = undefined;
  sub.cancelReason = undefined;
  await sub.save();
  return sub;
}

export async function cardManagementLink(userId) {
  const sub = await requirePaidLiveSubscription(userId);
  await resolveProviderSubscription(sub);
  const data = await paystack.manageLink(sub.paystack.subscriptionCode);
  return data.link;
}

export async function billingSummary(userId) {
  const sub = await getLiveSubscription(userId);
  const paid = sub && (sub.plan.price > 0 || sub.source === 'admin');
  return {
    paymentsEnabled: paystackEnabled(),
    subscription: paid
      ? {
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        startsAt: sub.startsAt,
        endsAt: sub.endsAt,
        autoRenew: sub.status === ACTIVE,
        source: sub.source,
        cancelledAt: sub.cancelledAt,
        paymentIssue: Boolean(sub.paymentIssueAt),
      }
      : null,
  };
}

export function listPayments(userId) {
  return Payment.find({ user: userId, status: { $ne: PAYMENT_STATUS.PENDING } })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('plan', 'name slug interval');
}

/** Scheduler: checkouts nobody finished within a day. */
export async function abandonStalePayments() {
  const res = await Payment.updateMany(
    { status: PAYMENT_STATUS.PENDING, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    { status: PAYMENT_STATUS.ABANDONED },
  );
  return res.modifiedCount;
}

// ---------------------------------------------------------------- staff actions

/**
 * Staff cancel. Paystack subscriptions are disabled at Paystack first.
 * `immediate` ends access now (refunds, if any, are issued in the Paystack dashboard);
 * otherwise access runs to the end of the paid period.
 */
export async function adminCancelSubscription(subscriptionId, { immediate }) {
  const sub = await Subscription.findById(subscriptionId).populate('plan');
  if (!sub) throw ApiError.notFound('Subscription not found');
  if (![ACTIVE, NON_RENEWING].includes(sub.status)) throw ApiError.badRequest('This subscription is not active');

  if (sub.source === 'paystack' && sub.status === ACTIVE) {
    await resolveProviderSubscription(sub);
    await paystack.disableSubscription({ code: sub.paystack.subscriptionCode, token: sub.paystack.emailToken });
  }
  sub.cancelledAt = new Date();
  sub.cancelReason = 'admin';
  if (immediate || sub.source === 'admin') {
    sub.status = CANCELLED;
    sub.endsAt = new Date();
  } else {
    sub.status = NON_RENEWING;
  }
  await sub.save();
  return sub;
}

/** Complimentary access chosen by staff: no payment, no renewal. */
export async function grantPlan({ userId, planId, days, note, grantedBy }) {
  const [user, plan] = await Promise.all([User.findById(userId), Plan.findById(planId)]);
  if (!user || user.role !== 'customer') throw ApiError.notFound('Customer not found');
  if (!plan || plan.price === 0) throw ApiError.badRequest('Choose a paid plan to grant');

  const live = await getLiveSubscription(user._id);
  if (live && live.source === 'paystack') {
    throw ApiError.conflict('This customer has a paid subscription. Cancel it before granting a plan.');
  }
  const now = new Date();
  const sub = await Subscription.create({
    user: user._id,
    plan: plan._id,
    status: NON_RENEWING,
    source: 'admin',
    amount: 0,
    currency: plan.currency,
    startsAt: now,
    endsAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
    grantedBy,
    note,
  });
  await retireOtherSubscriptions(user._id, sub._id);
  return sub.populate('plan');
}
