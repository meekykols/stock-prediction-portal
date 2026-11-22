import * as chat from '../../services/chat.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await chat.staffList({ status: req.query.status ?? 'open', mine: req.query.mine, staffId: req.user._id }) });
});
export const show = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await chat.staffThread(req.params.id) });
});
export const send = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await chat.staffSend(req.user, req.params.id, req.body.body) });
});
export const read = asyncHandler(async (req, res) => {
  await chat.staffMarkRead(req.params.id);
  res.json({ success: true });
});
export const assign = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await chat.assign(req.params.id, req.user._id) });
});
export const close = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await chat.close(req.user, req.params.id) });
});
