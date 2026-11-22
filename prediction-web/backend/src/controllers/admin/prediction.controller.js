import { Prediction, User } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { escapeRegex, paged, paging } from '../../utils/paging.js';

export const list = asyncHandler(async (req, res) => {
  const p = paging(req.query);
  const filter = {};
  if (['stock', 'sports'].includes(req.query.type)) filter.type = req.query.type;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    const ids = await User.find({ $or: [{ email: rx }, { firstName: rx }, { lastName: rx }] }).distinct('_id');
    filter.$or = [{ user: { $in: ids } }, { 'summary.ticker': rx }, { 'summary.home': rx }, { 'summary.away': rx }];
  }
  const [items, total] = await Promise.all([
    Prediction.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('user', 'firstName lastName email'),
    Prediction.countDocuments(filter),
  ]);
  res.json({ success: true, data: paged(items, total, p) });
});

export const show = asyncHandler(async (req, res) => {
  const prediction = await Prediction.findById(req.params.id).select('+result').populate('user', 'firstName lastName email');
  if (!prediction) throw ApiError.notFound('Prediction not found');
  res.json({ success: true, data: prediction });
});
