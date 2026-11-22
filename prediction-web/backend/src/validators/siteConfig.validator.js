import { body } from 'express-validator';

const optionalEmail = (f) => body(f).optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email');
const optionalUrl = (f) => body(f).optional({ values: 'falsy' }).trim().isURL().withMessage('Enter a valid URL');

export const updateSiteConfigRules = [
  body('siteName').optional().trim().notEmpty().isLength({ max: 80 }),
  body('tagline').optional().trim().isLength({ max: 160 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  optionalEmail('contact.email'),
  optionalEmail('contact.supportEmail'),
  ...['x', 'facebook', 'instagram', 'telegram', 'youtube', 'linkedin', 'tiktok'].map((s) => optionalUrl(`socials.${s}`)),
  optionalUrl('announcement.link'),
  body('announcement.enabled').optional().isBoolean().toBoolean(),
  body('maintenanceMode').optional().isBoolean().toBoolean(),
  body('seo.keywords').optional().isArray(),
];
