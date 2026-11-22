import * as chat from '../../services/chat.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const thread = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await chat.customerThread(req.user._id) });
});

export const send = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await chat.customerSend(req.user, req.body.body) });
});

export const read = asyncHandler(async (req, res) => {
  await chat.customerMarkRead(req.user._id);
  res.json({ success: true });
});
