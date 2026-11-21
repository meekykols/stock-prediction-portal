import { body } from 'express-validator';

const email = body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail();
const newPassword = (field) =>
  body(field)
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number');

export const registerRules = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 60 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 60 }),
  email,
  newPassword('password'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('country').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
];

export const loginRules = [
  email,
  body('password').notEmpty().withMessage('Password is required'),
];

export const updateProfileRules = [
  body('firstName').optional().trim().notEmpty().isLength({ max: 60 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 60 }),
  body('phone').optional({ values: 'null' }).trim().isLength({ max: 30 }),
  body('country').optional({ values: 'null' }).trim().isLength({ max: 60 }),
  body('preferences.theme').optional().isIn(['dark', 'light', 'system']),
  body('preferences.language').optional().isLength({ min: 2, max: 5 }),
];

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  newPassword('newPassword'),
];
