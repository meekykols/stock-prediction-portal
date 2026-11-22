import { body, param, query } from 'express-validator';
import { ASSET_CLASSES } from '../models/Prediction.js';

export const marketPredictionRules = [
  body('assetClass').isIn(ASSET_CLASSES).withMessage('Choose stocks, forex, commodities or crypto'),
  body('symbol').isString().trim().isLength({ min: 1, max: 30 }).withMessage('Enter a symbol'),
  body('horizon').optional().isInt({ min: 1, max: 30 }).withMessage('Horizon must be 1 to 30 days').toInt(),
];

export const sportsPredictionRules = [
  body('fixtureId').isInt({ min: 1 }).withMessage('Choose a fixture').toInt(),
];

export const listPredictionRules = [
  query('type').optional().isIn(['market', 'sports']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

export const predictionIdRules = [param('id').isMongoId().withMessage('Invalid prediction id')];

export const fixturesRules = [
  query('date').optional().isISO8601({ strict: true }).withMessage('Use YYYY-MM-DD').isLength({ min: 10, max: 10 }),
];
