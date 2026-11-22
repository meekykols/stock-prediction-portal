import { CodesConfig, Plan, Tip } from '../../models/index.js';
import * as codes from '../../services/codes.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { escapeRegex } from '../../utils/paging.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await codes.adminListCodes(req.query) });
});

export const stats = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await codes.codeStats({ days: 30 }) });
});

export const create = asyncHandler(async (req, res) => {
  const code = await codes.createCode(req.body, req.user);
  res.status(201).json({ success: true, message: 'Booking code posted', data: code });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Booking code updated', data: await codes.updateCode(req.params.id, req.body) });
});

export const withdraw = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Booking code withdrawn', data: await codes.withdrawCode(req.params.id) });
});

export const setResult = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Result updated', data: await codes.setCodeResult(req.params.id, req.body, req.user) });
});

export const setSelectionResult = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Selection updated', data: await codes.setSelectionResult(req.params.id, req.params.index, req.body.state) });
});

export const config = asyncHandler(async (_req, res) => {
  const [doc, plans] = await Promise.all([CodesConfig.getSingleton(), Plan.find({ isActive: true }).sort({ sortOrder: 1 }).select('name slug')]);
  res.json({ success: true, data: { config: doc, plans } });
});

export const updateConfig = asyncHandler(async (req, res) => {
  const doc = await CodesConfig.getSingleton();
  const { enabled, visiblePlans, platforms } = req.body;
  if (enabled !== undefined) doc.enabled = enabled;
  if (visiblePlans) doc.visiblePlans = [...new Set(visiblePlans)];
  if (platforms) {
    const seen = new Set();
    doc.platforms = platforms.map((p) => ({ ...p, slug: p.slug || slugify(p.name) })).filter((p) => !seen.has(p.slug) && seen.add(p.slug));
  }
  await doc.save();
  res.json({ success: true, message: 'Booking code settings saved', data: doc });
});

/** Upcoming tips to build selections from: matches that haven't started, optionally by date or team name. */
export const tipOptions = asyncHandler(async (req, res) => {
  const filter = { kickoff: { $gt: new Date() } };
  if (req.query.date) filter.date = req.query.date;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ 'home.name': rx }, { 'away.name': rx }, { 'league.name': rx }];
  }
  const items = await Tip.find(filter).sort({ kickoff: 1 }).limit(40)
    .select('sport kickoff league.name home.name away.name prediction.pick prediction.markets');
  res.json({ success: true, data: items });
});
