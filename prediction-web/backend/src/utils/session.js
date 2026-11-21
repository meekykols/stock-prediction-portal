import { env } from '../config/env.js';
import { AUDIENCE } from './tokens.js';

// Refresh tokens live in httpOnly cookies scoped to the auth routes, so page scripts
// never see them and they're only sent where they're needed.
export const SESSION_COOKIES = {
  [AUDIENCE.CUSTOMER]: { name: 'pw_rt', path: '/api/v1/auth' },
  [AUDIENCE.ADMIN]: { name: 'pw_art', path: '/api/admin/auth' },
};

const baseOptions = (path) => ({
  httpOnly: true,
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path,
});

export function setSessionCookie(res, audience, token) {
  const { name, path } = SESSION_COOKIES[audience];
  res.cookie(name, token, { ...baseOptions(path), maxAge: env.jwt.refreshTtlDays * 864e5 });
}

export function clearSessionCookie(res, audience) {
  const { name, path } = SESSION_COOKIES[audience];
  res.clearCookie(name, baseOptions(path));
}

export const readSessionCookie = (req, audience) => req.cookies?.[SESSION_COOKIES[audience].name];

export const requestMeta = (req) => ({ userAgent: req.get('user-agent'), ip: req.ip });
