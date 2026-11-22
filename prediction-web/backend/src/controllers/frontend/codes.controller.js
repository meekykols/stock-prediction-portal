import * as codes from '../../services/codes.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await codes.listCodes(req.user?._id, req.query) });
});

export const copy = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await codes.copyCode(req.user._id, req.params.id) });
});
