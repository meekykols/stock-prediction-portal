import { body } from 'express-validator';
import { ALL_PERMISSIONS } from '../utils/permissions.js';

export const createStaffRules = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isLength({ min: 10 }).withMessage('Staff passwords need at least 10 characters'),
  body('permissions').optional().isArray(),
  body('permissions.*').isIn(ALL_PERMISSIONS),
];

export const updateUserRules = [
  body('status').optional().isIn(['active', 'suspended']),
  body('permissions').optional().isArray(),
  body('permissions.*').isIn(ALL_PERMISSIONS),
];

export const grantPlanRules = [
  body('planId').isMongoId().withMessage('Choose a plan'),
  body('days').isInt({ min: 1, max: 730 }).withMessage('Days must be 1 to 730').toInt(),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
];

export const cancelSubscriptionRules = [
  body('immediate').optional().isBoolean().toBoolean(),
];
