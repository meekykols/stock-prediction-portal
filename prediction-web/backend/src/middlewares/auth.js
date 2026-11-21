import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AUDIENCE, verifyAccessToken } from '../utils/tokens.js';
import { hasPermission, ROLES } from '../utils/permissions.js';

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

const authenticate = (audience) =>
  asyncHandler(async (req, _res, next) => {
    const token = readBearer(req);
    if (!token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = verifyAccessToken(token, audience);
    } catch {
      throw ApiError.unauthorized('Session expired, please sign in again');
    }

    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') throw ApiError.unauthorized();
    if (audience === AUDIENCE.ADMIN && user.role === ROLES.CUSTOMER) throw ApiError.forbidden();

    req.user = user;
    next();
  });

/** Customer site (/api/v1). */
export const requireAuth = authenticate(AUDIENCE.CUSTOMER);

/** Staff console (/api/admin). Only staff and superadmins pass. */
export const requireStaff = authenticate(AUDIENCE.ADMIN);

/** Use after requireStaff. Superadmins pass every check. */
export const requirePermission =
  (...permissions) =>
  (req, _res, next) =>
    permissions.every((p) => hasPermission(req.user, p)) ? next() : next(ApiError.forbidden());

export const requireSuperadmin = (req, _res, next) =>
  req.user?.role === ROLES.SUPERADMIN ? next() : next(ApiError.forbidden());
