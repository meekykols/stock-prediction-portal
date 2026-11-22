import { JobRun, Plan, TipsConfig } from '../../models/index.js';
import * as tips from '../../services/tips.service.js';
import { mlService } from '../../services/ml.service.js';
import { isRunning } from '../../utils/jobRunner.js';
import { SPORTS } from '../../constants/sports.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const JOBS = { 'sports-tips': tips.generateTips, 'tips-settle': tips.settleTips };

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await tips.adminListTips(req.query) });
});

export const stats = asyncHandler(async (_req, res) => {
  const [d7, d30] = await Promise.all([tips.trackRecord({ days: 7 }), tips.trackRecord({ days: 30 })]);
  res.json({ success: true, data: { last7: d7.sports, last30: d30.sports } });
});

export const config = asyncHandler(async (_req, res) => {
  const [doc, plans] = await Promise.all([TipsConfig.getSingleton(), Plan.find({ isActive: true }).sort({ sortOrder: 1 }).select('name slug')]);
  res.json({ success: true, data: { config: doc, plans } });
});

export const updateConfig = asyncHandler(async (req, res) => {
  const doc = await TipsConfig.getSingleton();
  const { enabled, sports, fullAccessPlans, previewCount, featuredConfidence, odds } = req.body;
  if (odds) doc.set('odds', { ...doc.odds.toObject(), ...odds });
  if (enabled !== undefined) doc.enabled = enabled;
  if (previewCount !== undefined) doc.previewCount = previewCount;
  if (featuredConfidence) doc.featuredConfidence = featuredConfidence;
  if (fullAccessPlans) doc.fullAccessPlans = [...new Set(fullAccessPlans)];
  for (const s of SPORTS) {
    const patch = sports?.[s];
    if (!patch) continue;
    if (patch.enabled !== undefined) doc.sports[s].enabled = patch.enabled;
    if (patch.leagues) doc.sports[s].leagues = [...new Set(patch.leagues)];
  }
  await doc.save();
  res.json({ success: true, message: 'Tips settings saved', data: doc });
});

export const oddsReport = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await tips.oddsReport({ days: 90 }) });
});

export const leagues = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await mlService.sportsLeagues(req.query.sport) });
});

export const runNow = asyncHandler(async (req, res) => {
  const { job } = req.body;
  if (isRunning(job)) return res.status(409).json({ success: false, message: 'That job is already running' });
  JOBS[job]({ trigger: 'manual', triggeredBy: req.user._id }).catch((err) => console.error(`[tips] manual ${job} failed`, err));
  res.status(202).json({ success: true, message: 'Run started' });
});

export const runs = asyncHandler(async (_req, res) => {
  const items = await JobRun.find({ job: { $in: Object.keys(JOBS) } }).sort({ startedAt: -1 }).limit(20).populate('triggeredBy', 'firstName lastName');
  res.json({ success: true, data: { items, running: Object.keys(JOBS).filter(isRunning) } });
});

export const override = asyncHandler(async (req, res) => {
  const tip = await tips.overrideResult(req.params.id, req.body, req.user);
  res.json({ success: true, message: 'Result updated', data: tip });
});
