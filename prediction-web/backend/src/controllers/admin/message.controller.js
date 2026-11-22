import { ContactMessage } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

export const list = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json({ success: true, data: await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(200) });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['new', 'read', 'resolved'].includes(status)) throw ApiError.badRequest('Invalid status');
  const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
  if (!msg) throw ApiError.notFound('Message not found');
  res.json({ success: true, data: msg });
});
