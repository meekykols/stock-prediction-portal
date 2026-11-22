import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { addInterval, renewalEndsAt } from '../src/utils/billingPeriod.js';
import { isValidSignature } from '../src/services/paystack.client.js';

const d = (s) => new Date(`${s}T10:00:00.000Z`);

test('monthly interval keeps the day of month', () => {
  assert.equal(addInterval(d('2026-03-15'), 'monthly').toISOString(), d('2026-04-15').toISOString());
});

test('month-end dates clamp instead of overflowing', () => {
  assert.equal(addInterval(d('2026-01-31'), 'monthly').toISOString(), d('2026-02-28').toISOString());
  assert.equal(addInterval(d('2028-01-31'), 'monthly').toISOString(), d('2028-02-29').toISOString());
});

test('quarterly and annual intervals', () => {
  assert.equal(addInterval(d('2026-11-30'), 'quarterly').toISOString(), d('2027-02-28').toISOString());
  assert.equal(addInterval(d('2028-02-29'), 'annually').toISOString(), d('2029-02-28').toISOString());
});

test('unknown interval throws', () => {
  assert.throws(() => addInterval(new Date(), 'weekly'));
});

test('early renewal extends from the current end date', () => {
  assert.equal(renewalEndsAt(d('2026-12-01'), d('2026-11-30'), 'monthly').toISOString(), d('2027-01-01').toISOString());
});

test('late renewal extends from the payment date', () => {
  assert.equal(renewalEndsAt(d('2026-12-01'), d('2026-12-05'), 'monthly').toISOString(), d('2027-01-05').toISOString());
});

test('webhook signature: valid, tampered and missing', () => {
  const secret = 'sk_test_x';
  const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'r1' } }));
  const sig = crypto.createHmac('sha512', secret).update(body).digest('hex');
  assert.equal(isValidSignature(body, sig, secret), true);
  assert.equal(isValidSignature(Buffer.from(body.toString().replace('r1', 'r2')), sig, secret), false);
  assert.equal(isValidSignature(body, 'abc', secret), false);
  assert.equal(isValidSignature(body, undefined, secret), false);
  assert.equal(isValidSignature(body, sig, ''), false);
});
