import * as authService from '../../services/auth.service.js';
import { listUserSubscriptions } from '../../services/subscription.service.js';
import { uploadBuffer, destroyImage } from '../../services/media.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { AUDIENCE } from '../../utils/tokens.js';
import { requestMeta, setSessionCookie } from '../../utils/session.js';

const PROFILE_FIELDS = ['firstName', 'lastName', 'phone', 'country'];

export const updateProfile = asyncHandler(async (req, res) => {
  for (const field of PROFILE_FIELDS) {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  }
  if (req.body.preferences) {
    req.user.preferences = { ...req.user.preferences.toObject(), ...req.body.preferences };
  }
  await req.user.save();
  res.json({ success: true, data: { user: req.user } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  // Every session was revoked; keep this one signed in with a fresh pair.
  const { accessToken, refreshToken } = await authService.issueSession(user, AUDIENCE.CUSTOMER, requestMeta(req));
  setSessionCookie(res, AUDIENCE.CUSTOMER, refreshToken);
  res.json({ success: true, message: 'Password updated', data: { accessToken } });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const image = await uploadBuffer(req.file.buffer, 'avatars');
  const previous = req.user.avatar?.publicId;
  req.user.avatar = image;
  await req.user.save();
  await destroyImage(previous);
  res.json({ success: true, data: { user: req.user } });
});

export const subscriptionHistory = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listUserSubscriptions(req.user._id) });
});
