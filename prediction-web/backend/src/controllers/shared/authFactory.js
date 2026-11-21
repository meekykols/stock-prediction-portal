import * as authService from '../../services/auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  clearSessionCookie,
  readSessionCookie,
  requestMeta,
  setSessionCookie,
} from '../../utils/session.js';

/**
 * Login / refresh / logout handlers are identical for customers and staff
 * except for the token audience and cookie. `present` shapes the user payload.
 */
export function createAuthHandlers(audience, present) {
  const login = asyncHandler(async (req, res) => {
    const user = await authService.login(req.body, audience);
    const { accessToken, refreshToken } = await authService.issueSession(user, audience, requestMeta(req));
    setSessionCookie(res, audience, refreshToken);
    res.json({ success: true, data: { accessToken, ...(await present(user)) } });
  });

  const refresh = asyncHandler(async (req, res) => {
    try {
      const { user, accessToken, refreshToken } = await authService.rotateSession(
        readSessionCookie(req, audience),
        audience,
        requestMeta(req),
      );
      setSessionCookie(res, audience, refreshToken);
      res.json({ success: true, data: { accessToken, ...(await present(user)) } });
    } catch (err) {
      clearSessionCookie(res, audience);
      throw err;
    }
  });

  const logout = asyncHandler(async (req, res) => {
    await authService.revokeSession(readSessionCookie(req, audience));
    clearSessionCookie(res, audience);
    res.json({ success: true, message: 'Signed out' });
  });

  const me = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await present(req.user) });
  });

  return { login, refresh, logout, me };
}
