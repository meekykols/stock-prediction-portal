import * as authService from '../../services/auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AUDIENCE } from '../../utils/tokens.js';
import { requestMeta, setSessionCookie } from '../../utils/session.js';

export const changePassword = asyncHandler(async (req, res) => {
  const user = await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  const { accessToken, refreshToken } = await authService.issueSession(user, AUDIENCE.ADMIN, requestMeta(req));
  setSessionCookie(res, AUDIENCE.ADMIN, refreshToken);
  res.json({ success: true, message: 'Password updated', data: { accessToken } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  for (const f of ['firstName', 'lastName', 'phone']) if (req.body[f] !== undefined) req.user[f] = req.body[f];
  await req.user.save();
  res.json({ success: true, data: { user: req.user } });
});
