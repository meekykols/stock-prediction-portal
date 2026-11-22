import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const AUDIENCE = Object.freeze({ CUSTOMER: 'customer', ADMIN: 'admin' });

export function signAccessToken(user, audience) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
    audience,
  });
}

export function verifyAccessToken(token, audience) {
  return jwt.verify(token, env.jwt.accessSecret, { audience });
}

export const generateOpaqueToken = () => crypto.randomBytes(48).toString('hex');

export const hashToken = (token) =>
  crypto.createHmac('sha256', env.jwt.refreshSecret).update(token).digest('hex');
