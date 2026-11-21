import * as authService from '../../services/auth.service.js';
import { getCurrentEntitlement } from '../../services/subscription.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AUDIENCE } from '../../utils/tokens.js';
import { requestMeta, setSessionCookie } from '../../utils/session.js';
import { createAuthHandlers } from '../shared/authFactory.js';

export async function presentCustomer(user) {
  const entitlement = await getCurrentEntitlement(user._id);
  return {
    user: user.toJSON(),
    subscription: {
      status: entitlement.status,
      endsAt: entitlement.endsAt,
      plan: entitlement.plan?.toJSON() ?? null,
    },
  };
}

const handlers = createAuthHandlers(AUDIENCE.CUSTOMER, presentCustomer);

export const { login, refresh, logout, me } = handlers;

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  const { accessToken, refreshToken } = await authService.issueSession(user, AUDIENCE.CUSTOMER, requestMeta(req));
  setSessionCookie(res, AUDIENCE.CUSTOMER, refreshToken);
  res.status(201).json({ success: true, data: { accessToken, ...(await presentCustomer(user)) } });
});
