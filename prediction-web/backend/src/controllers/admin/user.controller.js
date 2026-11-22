import { Payment, Prediction, Subscription, User } from '../../models/index.js';
import { revokeAllSessions } from '../../services/auth.service.js';
import { getCurrentEntitlement, liveSubscriptionFilter } from '../../services/subscription.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ROLES } from '../../utils/permissions.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter = { role: req.query.role === 'staff' ? { $ne: ROLES.CUSTOMER } : ROLES.CUSTOMER };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q)), 'i');
    filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  const live = await Subscription.find({ user: { $in: users.map((u) => u._id) }, ...liveSubscriptionFilter() })
    .populate('plan', 'name slug');
  const planOf = Object.fromEntries(live.map((s) => [String(s.user), { name: s.plan?.name, slug: s.plan?.slug, source: s.source, status: s.status }]));
  const items = users.map((u) => ({ ...u.toJSON(), plan: planOf[String(u._id)] ?? null }));
  res.json({ success: true, data: { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const show = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const [entitlement, subscriptions, payments, predictionCounts, lastPrediction] = await Promise.all([
    getCurrentEntitlement(user._id),
    Subscription.find({ user: user._id, status: { $ne: 'pending' } }).sort({ createdAt: -1 }).limit(20).populate('plan', 'name slug interval price'),
    Payment.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).populate('plan', 'name slug'),
    Prediction.aggregate([{ $match: { user: user._id } }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    Prediction.findOne({ user: user._id }).sort({ createdAt: -1 }).select('createdAt type'),
  ]);
  res.json({
    success: true,
    data: {
      user,
      entitlement: {
        status: entitlement.status,
        endsAt: entitlement.endsAt,
        plan: entitlement.plan,
        subscriptionId: entitlement.subscription?.id ?? null,
        source: entitlement.subscription?.source ?? null,
      },
      subscriptions,
      payments,
      predictions: {
        counts: Object.fromEntries(predictionCounts.map((p) => [p._id, p.count])),
        lastAt: lastPrediction?.createdAt ?? null,
      },
    },
  });
});

export const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== ROLES.CUSTOMER && req.user.role !== ROLES.SUPERADMIN) {
    throw ApiError.forbidden('Only a superadmin can change staff accounts');
  }
  if (String(user._id) === String(req.user._id) && req.body.status === 'suspended') {
    throw ApiError.badRequest('You cannot suspend your own account');
  }

  if (req.body.status) user.status = req.body.status;
  if (req.body.permissions && user.role === ROLES.STAFF) {
    if (req.user.role !== ROLES.SUPERADMIN) throw ApiError.forbidden('Only a superadmin can change permissions');
    user.permissions = req.body.permissions;
  }
  await user.save();
  if (user.status === 'suspended') await revokeAllSessions(user._id);
  res.json({ success: true, data: user });
});

export const createStaff = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, permissions = [] } = req.body;
  if (await User.exists({ email })) throw ApiError.conflict('That email is already in use');
  const user = await User.create({
    firstName, lastName, email, password, permissions, role: ROLES.STAFF, emailVerified: true,
  });
  res.status(201).json({ success: true, data: user });
});
