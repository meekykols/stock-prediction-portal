import * as tips from '../../services/tips.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await tips.listTips(req.user?._id, req.query) });
});

export const record = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await tips.trackRecord({ days: 30 }) });
});
