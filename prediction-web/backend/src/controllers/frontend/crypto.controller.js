import * as crypto from '../../services/cryptoSignals.service.js';
import * as telegram from '../../services/telegram.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const feed = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await crypto.listForCustomer(req.user._id, req.query) });
});

export const telegramStatus = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await telegram.telegramStatus(req.user._id) });
});

export const telegramLink = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await telegram.createLinkCode(req.user._id) });
});

export const telegramUnlink = asyncHandler(async (req, res) => {
  await telegram.unlink(req.user._id);
  res.json({ success: true, message: 'Telegram disconnected' });
});
