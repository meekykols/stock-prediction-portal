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
