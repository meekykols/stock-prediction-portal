import { body, param, query } from 'express-validator';

export const stockPredictionRules = [
  body('ticker')
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9][A-Z0-9.\-=^]{0,14}$/)
    .withMessage('Enter a valid ticker symbol, e.g. AAPL or MTNN.LG'),
  body('horizon').optional().isInt({ min: 1, max: 30 }).withMessage('Horizon must be 1 to 30 days').toInt(),
];

export const sportsPredictionRules = [
  body('fixtureId').isInt({ min: 1 }).withMessage('Choose a fixture').toInt(),
];

export const listPredictionRules = [
  query('type').optional().isIn(['stock', 'sports']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

export const predictionIdRules = [param('id').isMongoId().withMessage('Invalid prediction id')];

export const fixturesRules = [
  query('date').optional().isISO8601({ strict: true }).withMessage('Use YYYY-MM-DD').isLength({ min: 10, max: 10 }),
];
