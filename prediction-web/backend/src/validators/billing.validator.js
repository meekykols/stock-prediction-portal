import { body, param } from 'express-validator';

export const checkoutRules = [
  body('plan').trim().matches(/^[a-z0-9-]+$/).withMessage('Choose a plan'),
];

export const referenceRules = [
  param('reference').matches(/^[A-Za-z0-9_.=-]{6,100}$/).withMessage('Invalid payment reference'),
];
