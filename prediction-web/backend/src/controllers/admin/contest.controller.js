import { ContestConfig, Promo } from '../../models/index.js';
import * as contest from '../../services/contest.service.js';
import { uploadBuffer, destroyImage } from '../../services/media.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { monthOf, utcDate } from '../../utils/contestScoring.js';

export const config = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await ContestConfig.getSingleton() });
});

export const updateConfig = asyncHandler(async (req, res) => {
  const doc = await ContestConfig.getSingleton();
  for (const k of ['enabled', 'freeUsersCanEnter', 'minPicks', 'maxPicks', 'perfectMultiplier', 'rulesNote']) {
    if (req.body[k] !== undefined) doc[k] = req.body[k];
  }
  if (doc.minPicks > doc.maxPicks) throw ApiError.badRequest('Maximum must be at least the minimum', { maxPicks: 'Must be at least the minimum' });
  await doc.save();
  res.json({ success: true, message: 'Contest settings saved', data: doc });
});

export const leaderboard = asyncHandler(async (req, res) => {
  const month = req.query.month || monthOf(utcDate());
  const [board, rewards] = await Promise.all([contest.leaderboard(month, { limit: 100, full: true }), contest.listRewards(month)]);
  res.json({ success: true, data: { ...board, closed: month < monthOf(utcDate()), rewards } });
});

export const award = asyncHandler(async (req, res) => {
  const reward = await contest.award(req.params.month, req.body, req.user);
  res.status(201).json({ success: true, message: 'Reward recorded', data: reward });
});

export const rewards = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await contest.listRewards() });
});

export const markPaid = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Marked as paid', data: await contest.markRewardPaid(req.params.id) });
});

export const exportCsv = asyncHandler(async (req, res) => {
  const csv = await contest.exportPicksCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="picks_${req.query.from}_${req.query.to}.csv"`);
  res.send(csv);
});

export const promos = asyncHandler(async (_req, res) => {
  const items = await Promo.find().sort({ createdAt: -1 }).limit(50).populate('owner', 'firstName lastName email');
  res.json({ success: true, data: items });
});

export const createPromo = asyncHandler(async (req, res) => {
  const promo = await Promo.create({ title: req.body.title || 'New advert', createdBy: req.user._id, label: req.body.label || 'Sponsored' });
  res.status(201).json({ success: true, message: 'Advert created', data: promo });
});

export const updatePromo = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Advert saved', data: await contest.updatePromo(req.params.id, req.body) });
});

export const uploadPromoImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image');
  const promo = await Promo.findById(req.params.id).select('+imagePublicId');
  if (!promo) throw ApiError.notFound('Advert not found');
  const { url, publicId } = await uploadBuffer(req.file.buffer, 'promos');
  const old = promo.imagePublicId;
  Object.assign(promo, { imageUrl: url, imagePublicId: publicId });
  await promo.save();
  await destroyImage(old);
  res.json({ success: true, message: 'Image uploaded', data: promo });
});
