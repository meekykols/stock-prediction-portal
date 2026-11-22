import * as billing from '../../services/billing.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { presentCustomer } from './auth.controller.js';

export const summary = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await billing.billingSummary(req.user._id) });
});

export const payments = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await billing.listPayments(req.user._id) });
});

export const checkout = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await billing.startCheckout(req.user, req.body.plan) });
});

export const verify = asyncHandler(async (req, res) => {
  const payment = await billing.verifyCheckout(req.user._id, req.params.reference);
  // Return the fresh session payload so the app can switch plans without a reload.
  res.json({ success: true, data: { payment, ...(await presentCustomer(req.user)) } });
});

export const cancel = asyncHandler(async (req, res) => {
  await billing.cancelAutoRenew(req.user._id);
  res.json({ success: true, message: 'Auto-renew is off. You keep access until the end of this period.', data: await billing.billingSummary(req.user._id) });
});

export const resume = asyncHandler(async (req, res) => {
  await billing.resumeAutoRenew(req.user._id);
  res.json({ success: true, message: 'Auto-renew is back on.', data: await billing.billingSummary(req.user._id) });
});

export const manageCard = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { url: await billing.cardManagementLink(req.user._id) } });
});
