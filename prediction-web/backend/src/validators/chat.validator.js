import { body, param, query } from 'express-validator';

export const messageRules = [
  body('body').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1 to 2000 characters'),
];
export const conversationIdRules = [param('id').isMongoId().withMessage('Invalid conversation')];
export const conversationListRules = [query('status').optional().isIn(['open', 'closed', ''])];

export const signalConfigRules = [
  body('enabled').optional().isBoolean().toBoolean(),
  body('markets.enabled').optional().isBoolean().toBoolean(),
  body('markets.watchlist').optional().isObject(),
  ...['stock', 'forex', 'commodity', 'crypto'].flatMap((c) => [
    body(`markets.watchlist.${c}`).optional().isArray({ max: 30 }).withMessage('Up to 30 symbols per market'),
    body(`markets.watchlist.${c}.*`).isString().trim().isLength({ min: 1, max: 30 }),
  ]),
  body('markets.horizon').optional().isInt({ min: 1, max: 30 }).toInt(),
  body('sports.enabled').optional().isBoolean().toBoolean(),
  body('sports.maxPerRun').optional().isInt({ min: 1, max: 30 }).toInt(),
];
export const runJobRules = [body('job').isIn(['market-signals', 'sports-signals']).withMessage('Unknown job')];
