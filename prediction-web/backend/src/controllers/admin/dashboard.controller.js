import { dashboardStats, serviceHealth } from '../../services/adminStats.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const stats = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await dashboardStats() });
});

export const health = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await serviceHealth() });
});
