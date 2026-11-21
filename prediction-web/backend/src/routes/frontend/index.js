import { Router } from 'express';
import * as auth from '../../controllers/frontend/auth.controller.js';
import * as account from '../../controllers/frontend/account.controller.js';
import * as pub from '../../controllers/frontend/public.controller.js';
import * as predictions from '../../controllers/frontend/prediction.controller.js';
import * as billing from '../../controllers/frontend/billing.controller.js';
import { checkoutRules, referenceRules } from '../../validators/billing.validator.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { authLimiter, contactLimiter, predictionLimiter } from '../../middlewares/rateLimit.js';
import { uploadImage } from '../../middlewares/upload.js';
import {
  changePasswordRules, loginRules, registerRules, updateProfileRules,
} from '../../validators/auth.validator.js';
import { contactRules } from '../../validators/contact.validator.js';
import {
  fixturesRules, listPredictionRules, predictionIdRules, sportsPredictionRules, stockPredictionRules,
} from '../../validators/prediction.validator.js';

const router = Router();

// Public
router.get('/site-config', pub.siteConfig);
router.get('/plans', pub.listPlans);
router.post('/contact', contactLimiter, validate(contactRules), pub.sendContactMessage);

// Auth
router.post('/auth/register', authLimiter, validate(registerRules), auth.register);
router.post('/auth/login', authLimiter, validate(loginRules), auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);

// Account
router.patch('/account/profile', requireAuth, validate(updateProfileRules), account.updateProfile);
router.patch('/account/password', requireAuth, validate(changePasswordRules), account.changePassword);
router.post('/account/avatar', requireAuth, uploadImage.single('image'), account.uploadAvatar);
router.get('/account/subscriptions', requireAuth, account.subscriptionHistory);

// Predictions
router.get('/predictions/usage', requireAuth, predictions.usage);
router.get('/predictions', requireAuth, validate(listPredictionRules), predictions.list);
router.get('/predictions/:id', requireAuth, validate(predictionIdRules), predictions.show);
router.post('/predictions/stocks', requireAuth, predictionLimiter, validate(stockPredictionRules), predictions.createStock);
router.post('/predictions/sports', requireAuth, predictionLimiter, validate(sportsPredictionRules), predictions.createSports);
router.get('/sports/fixtures', requireAuth, validate(fixturesRules), predictions.fixtures);

// Billing (Paystack)
router.get('/billing/summary', requireAuth, billing.summary);
router.get('/billing/payments', requireAuth, billing.payments);
router.post('/billing/checkout', requireAuth, predictionLimiter, validate(checkoutRules), billing.checkout);
router.get('/billing/verify/:reference', requireAuth, validate(referenceRules), billing.verify);
router.post('/billing/cancel', requireAuth, billing.cancel);
router.post('/billing/resume', requireAuth, billing.resume);
router.get('/billing/manage-card', requireAuth, billing.manageCard);

export default router;
