import { Router } from 'express';
import * as auth from '../../controllers/frontend/auth.controller.js';
import * as account from '../../controllers/frontend/account.controller.js';
import * as pub from '../../controllers/frontend/public.controller.js';
import * as predictions from '../../controllers/frontend/prediction.controller.js';
import * as billing from '../../controllers/frontend/billing.controller.js';
import * as chat from '../../controllers/frontend/chat.controller.js';
import * as signals from '../../controllers/frontend/signal.controller.js';
import { messageRules } from '../../validators/chat.validator.js';
import { checkoutRules, referenceRules } from '../../validators/billing.validator.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { authLimiter, chatLimiter, contactLimiter, predictionLimiter } from '../../middlewares/rateLimit.js';
import { uploadImage } from '../../middlewares/upload.js';
import {
  changePasswordRules, loginRules, registerRules, updateProfileRules,
} from '../../validators/auth.validator.js';
import { contactRules } from '../../validators/contact.validator.js';
import {
  fixturesRules, listPredictionRules, marketPredictionRules, predictionIdRules, sportsPredictionRules,
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
router.post('/predictions/markets', requireAuth, predictionLimiter, validate(marketPredictionRules), predictions.createMarket);
router.get('/markets/catalog', requireAuth, predictions.marketCatalog);
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

// Live chat
router.get('/chat', requireAuth, chat.thread);
router.post('/chat/messages', requireAuth, chatLimiter, validate(messageRules), chat.send);
router.post('/chat/read', requireAuth, chat.read);

// Premium signals feed
router.get('/signals', requireAuth, signals.list);
router.get('/signals/:id', requireAuth, validate(predictionIdRules), signals.show);

export default router;
