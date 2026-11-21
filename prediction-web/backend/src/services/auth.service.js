import { RefreshToken, User } from '../models/index.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { AUDIENCE, generateOpaqueToken, hashToken, signAccessToken } from '../utils/tokens.js';
import { ROLES } from '../utils/permissions.js';

const REUSE_GRACE_MS = 30 * 1000;

export async function issueSession(user, audience, meta = {}) {
  const refreshToken = generateOpaqueToken();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    audience,
    expiresAt: new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  return { accessToken: signAccessToken(user, audience), refreshToken };
}

export async function register({ firstName, lastName, email, password, phone, country }) {
  const exists = await User.exists({ email: email.toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists');
  return User.create({ firstName, lastName, email, password, phone, country });
}

export async function login({ email, password }, audience) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  const valid = user && (await user.comparePassword(password));
  if (!valid) throw ApiError.unauthorized('Invalid email or password');
  if (audience === AUDIENCE.ADMIN && user.role === ROLES.CUSTOMER) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.status !== 'active') throw ApiError.forbidden('This account has been suspended');

  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });
  return user;
}

/** Exchanges a refresh token for a new pair. Detects reuse of revoked tokens. */
export async function rotateSession(rawToken, audience, meta = {}) {
  if (!rawToken) throw ApiError.unauthorized('No active session');

  const record = await RefreshToken.findOne({ tokenHash: hashToken(rawToken), audience });
  if (!record || record.expiresAt < new Date()) throw ApiError.unauthorized('Session expired');

  if (record.revokedAt) {
    // A token that was already rotated is being replayed. Outside a short grace window
    // (parallel tabs refreshing at once) treat it as theft and end every session.
    if (Date.now() - record.revokedAt.getTime() > REUSE_GRACE_MS) {
      await RefreshToken.updateMany(
        { user: record.user, revokedAt: null },
        { revokedAt: new Date() },
      );
    }
    throw ApiError.unauthorized('Session expired');
  }

  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: record._id, revokedAt: null },
    { revokedAt: new Date() },
  );
  if (!claimed) throw ApiError.unauthorized('Session expired');

  const user = await User.findById(record.user);
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Session expired');
  if (audience === AUDIENCE.ADMIN && user.role === ROLES.CUSTOMER) throw ApiError.forbidden();

  const tokens = await issueSession(user, audience, meta);
  return { user, ...tokens };
}

export async function revokeSession(rawToken) {
  if (!rawToken) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { revokedAt: new Date() },
  );
}

export async function revokeAllSessions(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect', {
      currentPassword: 'Current password is incorrect',
    });
  }
  user.password = newPassword;
  await user.save();
  await revokeAllSessions(user._id);
  return user;
}
