import { body, param, query } from 'express-validator';
import { CODE_MARKETS } from '../models/index.js';
import { MARKET_OUTCOMES } from '../utils/sportsMarkets.js';

const selectionRules = (prefix) => [
  body(prefix).optional().isArray({ max: 50 }).withMessage('Up to 50 selections'),
  body(`${prefix}.*.tipId`).optional({ values: 'falsy' }).isMongoId(),
  body(`${prefix}.*.label`).custom((v, { req, path }) => {
    const i = Number(path.match(/\[(\d+)\]/)[1]);
    if (req.body[prefix][i]?.tipId) return true; // details come from the linked tip
    if (typeof v !== 'string' || v.trim().length < 3 || v.trim().length > 120) throw new Error('Describe the match, e.g. "Arsenal v Wolves"');
    return true;
  }),
  body(`${prefix}.*.kickoff`).optional({ values: 'falsy' }).isISO8601(),
  body(`${prefix}.*.market`).isIn(CODE_MARKETS).withMessage('Unknown market'),
  body(`${prefix}.*.outcome`).custom((v, { req, path }) => {
    const i = Number(path.match(/\[(\d+)\]/)[1]);
    const market = req.body[prefix][i]?.market;
    if (!MARKET_OUTCOMES[market]?.includes(v)) throw new Error(`Choose one of: ${(MARKET_OUTCOMES[market] || []).join(', ')}`);
    return true;
  }),
  body(`${prefix}.*.line`).custom((v, { req, path }) => {
    const i = Number(path.match(/\[(\d+)\]/)[1]);
    if (req.body[prefix][i]?.market !== 'total') return true;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || Math.abs((n % 1) - 0.5) > 1e-9) throw new Error('Use a half line, e.g. 2.5');
    return true;
  }).customSanitizer((v) => (v === undefined || v === null || v === '' ? undefined : Number(v))),
];

const codeField = (optional) => (optional ? body('code').optional() : body('code'))
  .isString().trim().matches(/^[A-Za-z0-9-]{3,40}$/).withMessage('3–40 letters, numbers or dashes');

export const createCodeRules = [
  body('platform').isString().trim().notEmpty().withMessage('Choose a platform'),
  codeField(false),
  body('odds').optional({ values: 'null' }).isFloat({ min: 1.01, max: 1e6 }).withMessage('Total odds from 1.01').toFloat(),
  body('note').optional({ values: 'null' }).isString().trim().isLength({ max: 300 }),
  body('expiresAt').optional({ values: 'falsy' }).isISO8601(),
  ...selectionRules('selections'),
];

export const updateCodeRules = [
  param('id').isMongoId(),
  body('platform').optional().isString().trim().notEmpty(),
  codeField(true),
  body('odds').optional({ values: 'null' }).isFloat({ min: 1.01, max: 1e6 }).toFloat(),
  body('note').optional({ values: 'null' }).isString().trim().isLength({ max: 300 }),
  body('expiresAt').optional({ values: 'falsy' }).isISO8601(),
  ...selectionRules('selections'),
];

export const codeResultRules = [
  param('id').isMongoId(),
  body('state').isIn(['pending', 'won', 'lost', 'void']).withMessage('Choose won, lost, void or pending'),
  body('note').optional().isString().trim().isLength({ max: 200 }),
];

export const selectionResultRules = [
  param('id').isMongoId(),
  param('index').isInt({ min: 0, max: 49 }).toInt(),
  body('state').isIn(['pending', 'won', 'lost', 'void']),
];

export const codesConfigRules = [
  body('enabled').optional().isBoolean().toBoolean(),
  body('visiblePlans').optional().isArray({ max: 20 }),
  body('visiblePlans.*').isString().trim().toLowerCase(),
  body('platforms').optional().isArray({ min: 1, max: 60 }).withMessage('Keep at least one platform'),
  body('platforms.*.name').isString().trim().isLength({ min: 2, max: 40 }),
  body('platforms.*.slug').optional({ values: 'falsy' }).isString().trim().toLowerCase().matches(/^[a-z0-9-]{2,40}$/),
  body('platforms.*.website').optional({ values: 'falsy' }).isURL({ protocols: ['https', 'http'], require_protocol: true }).withMessage('Use a full https:// link'),
  body('platforms.*.color').optional({ values: 'falsy' }).matches(/^#[0-9a-fA-F]{6}$/).withMessage('Use a hex colour like #22d3ee'),
  body('platforms.*.active').optional().isBoolean().toBoolean(),
];

export const listCodesRules = [
  query('view').optional().isIn(['active', 'recent']),
  query('platform').optional().isString().trim().isLength({ max: 40 }),
];

export const tipSearchRules = [
  query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('q').optional().isString().trim().isLength({ max: 60 }),
];
