import { body } from 'express-validator';

export const contactRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('subject').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('message').trim().isLength({ min: 10, max: 5000 }).withMessage('Message must be 10 to 5000 characters'),
];
