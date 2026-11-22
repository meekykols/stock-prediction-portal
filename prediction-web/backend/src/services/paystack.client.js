import crypto from 'node:crypto';
import axios from 'axios';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// https://paystack.com/docs/api/ — all amounts are in the smallest unit (kobo).
const http = axios.create({ baseURL: env.paystack.baseUrl, timeout: 20_000 });

http.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${env.paystack.secretKey}`;
  return config;
});

export const paystackEnabled = () => Boolean(env.paystack.secretKey);

function assertEnabled() {
  if (!paystackEnabled()) {
    throw new ApiError(503, 'Online payments are not available yet.', undefined, 'payments_not_configured');
  }
}

async function call(method, url, data) {
  assertEnabled();
  try {
    const res = await http.request({ method, url, data });
    return res.data.data;
  } catch (err) {
    const message = err.response?.data?.message;
    console.error(`[paystack] ${method.toUpperCase()} ${url} failed:`, message || err.message);
    throw new ApiError(502, 'The payment provider could not complete the request. Please try again.', undefined, 'payment_provider_error');
  }
}

const PAYSTACK_INTERVAL = { monthly: 'monthly', quarterly: 'quarterly', annually: 'annually' };

export const paystack = {
  createPlan: ({ name, amount, interval, currency }) =>
    call('post', '/plan', { name, amount, interval: PAYSTACK_INTERVAL[interval], currency }),

  initializeTransaction: ({ email, amount, currency, reference, plan, callbackUrl, metadata }) =>
    call('post', '/transaction/initialize', {
      email, amount, currency, reference, plan, callback_url: callbackUrl, metadata,
    }),

  verifyTransaction: (reference) => call('get', `/transaction/verify/${encodeURIComponent(reference)}`),

  fetchSubscription: (code) => call('get', `/subscription/${encodeURIComponent(code)}`),

  listCustomerSubscriptions: (customerId) => call('get', `/subscription?customer=${encodeURIComponent(customerId)}&perPage=50`),

  disableSubscription: ({ code, token }) => call('post', '/subscription/disable', { code, token }),

  enableSubscription: ({ code, token }) => call('post', '/subscription/enable', { code, token }),

  manageLink: (code) => call('get', `/subscription/${encodeURIComponent(code)}/manage/link`),
};

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function isValidSignature(rawBody, signature, secret = env.paystack.secretKey) {
  if (!secret || !signature || !rawBody) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
