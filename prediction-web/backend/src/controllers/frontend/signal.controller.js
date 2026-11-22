import * as signals from '../../services/signals.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const type = ['stock', 'sports'].includes(req.query.type) ? req.query.type : undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : undefined;
  res.json({ success: true, data: await signals.feed(req.user._id, { date, type }) });
});

export const show = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await signals.signalDetail(req.user._id, req.params.id) });
});
