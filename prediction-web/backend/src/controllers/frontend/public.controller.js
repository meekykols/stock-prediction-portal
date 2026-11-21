import { ContactMessage, Plan } from '../../models/index.js';
import { getSiteConfig } from '../../services/siteConfig.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const siteConfig = asyncHandler(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, data: await getSiteConfig() });
});

export const listPlans = asyncHandler(async (_req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });
  res.json({ success: true, data: plans });
});

export const sendContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  await ContactMessage.create({ name, email, subject, message, user: req.user?._id });
  res.status(201).json({ success: true, message: 'Thanks! Our team will get back to you shortly.' });
});
