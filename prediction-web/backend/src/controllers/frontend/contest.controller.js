import * as contest from '../../services/contest.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const state = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await contest.contestState(req.user._id) });
});

export const submit = asyncHandler(async (req, res) => {
  const slip = await contest.submitSlip(req.user._id, req.body.picks);
  res.status(201).json({ success: true, message: 'Slip entered. Good luck!', data: slip });
});

export const slips = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await contest.mySlips(req.user._id, req.query) });
});

export const leaderboard = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await contest.leaderboard(req.query.month, { userId: req.user?._id, limit: 50 }) });
});

export const winners = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await contest.winners() });
});

export const promos = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await contest.activePromos() });
});
