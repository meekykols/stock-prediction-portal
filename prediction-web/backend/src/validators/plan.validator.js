import { body } from 'express-validator';

const planFields = (optional) => {
  const field = (name) => (optional ? body(name).optional() : body(name));
  return [
    field('name').trim().notEmpty().withMessage('Name is required'),
    field('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug: lowercase letters, numbers and dashes'),
    field('price').isInt({ min: 0 }).withMessage('Price must be a whole number in kobo').toInt(),
    body('interval').optional().isIn(['monthly', 'quarterly', 'annually']),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('features').optional().isArray(),
    body('features.*').optional().isString().trim(),
    body('limits.stockPredictionsPerDay').optional().isInt({ min: -1 }).toInt(),
    body('limits.sportsPredictionsPerDay').optional().isInt({ min: -1 }).toInt(),
    body('limits.premiumSignals').optional().isBoolean().toBoolean(),
    body('limits.liveChat').optional().isBoolean().toBoolean(),
    body('limits.apiAccess').optional().isBoolean().toBoolean(),
    body('highlighted').optional().isBoolean().toBoolean(),
    body('isActive').optional().isBoolean().toBoolean(),
    body('sortOrder').optional().isInt().toInt(),
  ];
};

export const createPlanRules = planFields(false);
export const updatePlanRules = planFields(true);
