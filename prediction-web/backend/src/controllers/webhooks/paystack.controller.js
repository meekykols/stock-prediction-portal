import * as billing from '../../services/billing.service.js';
import { isValidSignature } from '../../services/paystack.client.js';

const HANDLERS = {
  'charge.success': billing.handleChargeSuccess,
  'subscription.create': billing.handleSubscriptionCreate,
  'subscription.not_renew': billing.handleSubscriptionNotRenewing,
  'subscription.disable': billing.handleSubscriptionDisable,
  'invoice.payment_failed': billing.handlePaymentFailed,
};

/**
 * POST /api/webhooks/paystack — mounted with express.raw() so the signature is
 * checked against the exact bytes Paystack sent. Any non-2xx makes Paystack retry.
 */
export async function paystackWebhook(req, res) {
  if (!isValidSignature(req.body, req.get('x-paystack-signature'))) {
    return res.sendStatus(401);
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.sendStatus(400);
  }

  const handler = HANDLERS[event.event];
  if (!handler) return res.sendStatus(200); // events we don't use

  try {
    await handler(event.data || {});
    return res.sendStatus(200);
  } catch (err) {
    console[err.retryable ? 'warn' : 'error'](`[webhook] ${event.event} failed:`, err.message);
    return res.sendStatus(500);
  }
}
