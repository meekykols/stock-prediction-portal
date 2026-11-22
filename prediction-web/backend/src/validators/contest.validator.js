import { body, param, query } from 'express-validator';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const submitSlipRules = [
  body('picks').isArray({ min: 1, max: 50 }).withMessage('Add your picks'),
  body('picks.*.tipId').isMongoId().withMessage('Unknown match'),
  body('picks.*.outcome').isIn(['home', 'draw', 'away']).withMessage('Choose 1, X or 2'),
];

export const monthQuery = [query('month').optional().matches(MONTH).withMessage('Use YYYY-MM')];

export const contestConfigRules = [
  body('enabled').optional().isBoolean().toBoolean(),
  body('freeUsersCanEnter').optional().isBoolean().toBoolean(),
  body('minPicks').optional().isInt({ min: 1, max: 50 }).toInt(),
  body('maxPicks').optional().isInt({ min: 1, max: 50 }).toInt()
    .custom((max, { req }) => {
      if (req.body.minPicks !== undefined && Number(req.body.minPicks) > Number(max)) throw new Error('Maximum must be at least the minimum');
      return true;
    }),
  body('perfectMultiplier').optional().isFloat({ min: 1, max: 10 }).toFloat(),
  body('rulesNote').optional().isString().trim().isLength({ max: 600 }),
];

export const awardRules = [
  param('month').matches(MONTH),
  body('userId').isMongoId().withMessage('Choose a winner'),
  body('type').isIn(['cash', 'elite', 'advert']).withMessage('Choose cash, Elite or advert'),
  body('amount').if(body('type').equals('cash')).isFloat({ min: 1, max: 1e8 }).withMessage('Enter the cash amount').toFloat(),
  body('days').optional().isInt({ min: 1, max: 365 }).toInt(),
  body('note').optional().isString().trim().isLength({ max: 300 }),
];

export const exportRules = [
  query('from').matches(DATE).withMessage('from: YYYY-MM-DD'),
  query('to').matches(DATE).withMessage('to: YYYY-MM-DD'),
];

const url = (field) => body(field).optional({ values: 'falsy' }).isURL({ protocols: ['https', 'http'], require_protocol: true }).withMessage('Use a full https:// link');
export const promoRules = [
  param('id').isMongoId(),
  body('title').optional().isString().trim().isLength({ min: 2, max: 80 }),
  body('body').optional().isString().trim().isLength({ max: 240 }),
  body('label').optional().isString().trim().isLength({ max: 40 }),
  body('linkLabel').optional().isString().trim().isLength({ max: 30 }),
  url('imageUrl'),
  url('linkUrl'),
  body('startsAt').optional({ values: 'falsy' }).isISO8601().toDate(),
  body('endsAt').optional({ values: 'falsy' }).isISO8601().toDate(),
  body('status').optional().isIn(['draft', 'live', 'ended']),
];
