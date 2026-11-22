import { body, param, query } from 'express-validator';
import { SPORTS } from '../constants/sports.js';

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export const listTipsRules = [
  query('sport').optional().isIn(SPORTS).withMessage('Unknown sport'),
  query('date').optional().custom(isDate).withMessage('Use YYYY-MM-DD'),
];

export const tipsConfigRules = [
  body('enabled').optional().isBoolean().toBoolean(),
  ...SPORTS.flatMap((s) => [
    body(`sports.${s}.enabled`).optional().isBoolean().toBoolean(),
    body(`sports.${s}.leagues`).optional().isArray({ max: 100 }).withMessage('Up to 100 leagues per sport'),
    body(`sports.${s}.leagues.*`).isInt({ min: 1 }).toInt(),
  ]),
  body('fullAccessPlans').optional().isArray({ max: 20 }),
  body('fullAccessPlans.*').isString().trim().toLowerCase(),
  body('previewCount').optional().isInt({ min: 0, max: 50 }).toInt(),
  body('featuredConfidence').optional().isIn(['high', 'medium']),
];

export const leaguesRules = [query('sport').isIn(SPORTS).withMessage('Unknown sport')];
export const runTipsJobRules = [body('job').isIn(['sports-tips', 'tips-settle']).withMessage('Unknown job')];
export const overrideRules = [
  param('id').isMongoId(),
  body('state').isIn(['won', 'lost', 'void']).withMessage('Choose won, lost or void'),
  body('note').optional().isString().trim().isLength({ max: 200 }),
];
