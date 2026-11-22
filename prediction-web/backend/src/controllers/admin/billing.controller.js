import mongoose from 'mongoose';
import { Payment, Subscription, User } from '../../models/index.js';
import { adminCancelSubscription, grantPlan } from '../../services/billing.service.js';
import { liveSubscriptionFilter } from '../../services/subscription.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { escapeRegex, paged, paging } from '../../utils/paging.js';

/** Optional `q` (customer name/email) → matching user ids. */
async function userFilter(q) {
  if (!q) return null;
  const rx = new RegExp(escapeRegex(q), 'i');
  const ids = await User.find({ $or: [{ email: rx }, { firstName: rx }, { lastName: rx }] }).distinct('_id');
  return { $in: ids };
}

const USER_FIELDS = 'firstName lastName email';

export const subscriptions = asyncHandler(async (req, res) => {
  const p = paging(req.query);
  const filter = {};
  if (req.query.status === 'live') Object.assign(filter, liveSubscriptionFilter());
  else if (req.query.status) filter.status = req.query.status;
  else filter.status = { $ne: 'pending' };
  if (req.query.source) filter.source = req.query.source;
  if (req.query.plan && mongoose.isValidObjectId(req.query.plan)) filter.plan = req.query.plan;
  if (req.query.issue === 'true') filter.paymentIssueAt = { $ne: null };
  const users = await userFilter(req.query.q);
  if (users) filter.user = users;

  const [items, total] = await Promise.all([
    Subscription.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit)
      .populate('user', USER_FIELDS).populate('plan', 'name slug interval price currency'),
    Subscription.countDocuments(filter),
  ]);
  res.json({ success: true, data: paged(items, total, p) });
});

export const payments = asyncHandler(async (req, res) => {
  const p = paging(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.kind) filter.kind = req.query.kind;
  const users = await userFilter(req.query.q);
  if (users) filter.user = users;
  if (req.query.reference) filter.reference = String(req.query.reference);

  const [items, total, totals] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit)
      .populate('user', USER_FIELDS).populate('plan', 'name slug'),
    Payment.countDocuments(filter),
    Payment.aggregate([{ $match: { ...filter, status: 'success' } }, { $group: { _id: '$currency', amount: { $sum: '$amount' } } }]),
  ]);
  res.json({ success: true, data: { ...paged(items, total, p), totals } });
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const sub = await adminCancelSubscription(req.params.id, { immediate: Boolean(req.body.immediate) });
  res.json({ success: true, message: req.body.immediate ? 'Subscription ended' : 'Auto-renew turned off', data: sub });
});

export const grant = asyncHandler(async (req, res) => {
  const sub = await grantPlan({
    userId: req.params.id, planId: req.body.planId, days: req.body.days, note: req.body.note, grantedBy: req.user._id,
  });
  res.status(201).json({ success: true, message: `${sub.plan.name} granted for ${req.body.days} days`, data: sub });
});
