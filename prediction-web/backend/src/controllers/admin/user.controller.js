import { User } from '../../models/index.js';
import { revokeAllSessions } from '../../services/auth.service.js';
import { getCurrentEntitlement } from '../../services/subscription.service.js';
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
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
});

export const show = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const entitlement = await getCurrentEntitlement(user._id);
  res.json({ success: true, data: { user, subscription: entitlement } });
});

export const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN) throw ApiError.forbidden();
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
