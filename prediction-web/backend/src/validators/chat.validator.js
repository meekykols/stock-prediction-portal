import { body, param, query } from 'express-validator';

export const messageRules = [
  body('body').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1 to 2000 characters'),
];
export const conversationIdRules = [param('id').isMongoId().withMessage('Invalid conversation')];
export const conversationListRules = [query('status').optional().isIn(['open', 'closed', ''])];

export const signalConfigRules = [
  body('enabled').optional().isBoolean().toBoolean(),
  body('stocks.enabled').optional().isBoolean().toBoolean(),
  body('stocks.tickers').optional().isArray({ max: 50 }).withMessage('Up to 50 tickers'),
  body('stocks.tickers.*').isString().trim().toUpperCase().matches(/^[A-Z0-9][A-Z0-9.\-=^]{0,14}$/).withMessage('Invalid ticker'),
  body('stocks.horizon').optional().isInt({ min: 1, max: 30 }).toInt(),
  body('sports.enabled').optional().isBoolean().toBoolean(),
  body('sports.maxPerRun').optional().isInt({ min: 1, max: 30 }).toInt(),
];
export const runJobRules = [body('job').isIn(['stock-signals', 'sports-signals']).withMessage('Unknown job')];
