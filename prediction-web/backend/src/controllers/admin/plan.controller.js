import { Plan } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

export const list = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await Plan.find().sort({ sortOrder: 1, price: 1 }) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await Plan.create(req.body) });
});

export const update = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  plan.set(req.body);
  if (plan.isModified('price') || plan.isModified('interval') || plan.isModified('currency')) {
    plan.paystackPlanCode = undefined;
  }
  await plan.save();
  res.json({ success: true, data: plan });
});

// Plans are archived, not deleted, so existing subscriptions keep their reference.
export const archive = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { returnDocument: 'after' });
  if (!plan) throw ApiError.notFound('Plan not found');
  res.json({ success: true, data: plan });
});
