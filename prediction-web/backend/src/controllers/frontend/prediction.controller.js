import * as predictions from '../../services/prediction.service.js';
import { getCurrentEntitlement } from '../../services/subscription.service.js';
import { mlService } from '../../services/ml.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const respond = (res, { prediction, reused }) =>
  res.status(reused ? 200 : 201).json({ success: true, data: { prediction, reused } });

export const usage = asyncHandler(async (req, res) => {
  const { plan } = await getCurrentEntitlement(req.user._id);
  res.json({ success: true, data: await predictions.getUsage(req.user._id, plan) });
});

export const createStock = asyncHandler(async (req, res) => {
  respond(res, await predictions.createStockPrediction(req.user._id, { ticker: req.body.ticker, horizon: req.body.horizon ?? 7 }));
});

export const createSports = asyncHandler(async (req, res) => {
  respond(res, await predictions.createSportsPrediction(req.user._id, { fixtureId: req.body.fixtureId }));
});

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await predictions.listPredictions(req.user._id, req.query) });
});

export const show = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await predictions.getPrediction(req.user._id, req.params.id) });
});

export const fixtures = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await mlService.sportsFixtures(req.query.date) });
});
