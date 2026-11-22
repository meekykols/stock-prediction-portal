import { body, param, query } from 'express-validator';

const price = (field) => body(field).isFloat({ gt: 0 }).withMessage('Enter a price').toFloat();

export const createSignalRules = [
  body('exchange').isIn(['binance', 'bybit']).withMessage('Choose Binance or Bybit'),
  body('symbol').isString().trim().isLength({ min: 2, max: 20 }).withMessage('Enter a coin, e.g. BTC'),
  body('timeframe').isIn(['15m', '1h', '4h']).withMessage('Choose 15m, 1h or 4h'),
  body('side').isIn(['long', 'short']).withMessage('Choose long or short'),
  body('entryType').isIn(['market', 'limit']).withMessage('Choose market or limit'),
  body('entry').if(body('entryType').equals('limit')).isFloat({ gt: 0 }).withMessage('Enter the limit price').toFloat(),
  price('sl'),
  body('tps').isArray({ min: 1, max: 3 }).withMessage('Add 1 to 3 take-profits'),
  body('tps.*').isFloat({ gt: 0 }).withMessage('Take-profits must be prices').toFloat(),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }),
];

export const marketRules = [
  query('exchange').isIn(['binance', 'bybit']),
  query('symbol').isString().trim().isLength({ min: 2, max: 20 }),
];

export const cryptoConfigRules = [
  body('enabled').optional().isBoolean().toBoolean(),
  body('paused.on').optional().isBoolean().toBoolean(),
  body('paused.reason').optional({ values: 'null' }).isString().trim().isLength({ max: 200 }),
  body('paused.until').optional({ values: 'falsy' }).isISO8601().toDate(),
  ...['swing', 'day'].map((s) => body(`styles.${s}.enabled`).optional().isBoolean().toBoolean()),
  body('coins.top.enabled').optional().isBoolean().toBoolean(),
  body('coins.top.n').optional().isInt({ min: 1, max: 100 }).toInt(),
  body('coins.top.exchange').optional().isIn(['binance', 'bybit']),
  body('coins.fixed.enabled').optional().isBoolean().toBoolean(),
  body('coins.fixed.list').optional().isArray({ max: 100 }),
  body('coins.fixed.list.*').isString().trim().toUpperCase().matches(/^[A-Z0-9]{2,20}$/).withMessage('Use symbols like BTCUSDT'),
  ...['binance', 'bybit'].map((e) => body(`exchanges.${e}`).optional().isBoolean().toBoolean()),
  ...['manual', 'swing', 'day'].flatMap((k) => [body(`plans.${k}`).optional().isArray({ max: 20 }), body(`plans.${k}.*`).isString().trim().toLowerCase()]),
  body('rules.feePct').optional().isFloat({ min: 0, max: 0.01 }).toFloat(),
  body('rules.breakeven').optional().isBoolean().toBoolean(),
  ...['swing', 'day'].flatMap((s) => [
    body(`rules.limitExpiryHours.${s}`).optional().isFloat({ min: 0.25, max: 720 }).toFloat(),
    body(`rules.maxHoldHours.${s}`).optional().isFloat({ min: 1, max: 2160 }).toFloat(),
  ]),
  body('rules.maxEntryDistancePct').optional().isFloat({ min: 0.5, max: 50 }).toFloat(),
  body('telegram.enabled').optional().isBoolean().toBoolean(),
];

export const signalIdRules = [param('id').isMongoId()];
export const feedRules = [query('view').optional().isIn(['live', 'closed']), query('kind').optional().isIn(['manual', 'swing', 'day'])];
