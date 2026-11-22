import { Router } from 'express';
import * as auth from '../../controllers/frontend/auth.controller.js';
import * as account from '../../controllers/frontend/account.controller.js';
import * as pub from '../../controllers/frontend/public.controller.js';
import * as predictions from '../../controllers/frontend/prediction.controller.js';
import * as billing from '../../controllers/frontend/billing.controller.js';
import * as chat from '../../controllers/frontend/chat.controller.js';
import * as signals from '../../controllers/frontend/signal.controller.js';
import * as tips from '../../controllers/frontend/tips.controller.js';
import * as codes from '../../controllers/frontend/codes.controller.js';
import * as contest from '../../controllers/frontend/contest.controller.js';
import * as crypto from '../../controllers/frontend/crypto.controller.js';
import { feedRules } from '../../validators/crypto.validator.js';
import { monthQuery, submitSlipRules } from '../../validators/contest.validator.js';
import { listCodesRules } from '../../validators/codes.validator.js';
import { listTipsRules } from '../../validators/tips.validator.js';
import { messageRules } from '../../validators/chat.validator.js';
import { checkoutRules, referenceRules } from '../../validators/billing.validator.js';
import { optionalAuth, requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  authLimiter, chatLimiter, contactLimiter, contestLimiter, predictionLimiter,
} from '../../middlewares/rateLimit.js';
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

// Daily sports tips: public, with more detail for plans that have full access
router.get('/tips', optionalAuth, validate(listTipsRules), tips.list);
router.get('/tips/record', tips.record);

// Booking codes: visible to the plans switched on in the console; others see locked cards
router.get('/codes', optionalAuth, validate(listCodesRules), codes.list);
router.post('/codes/:id/copy', requireAuth, validate(predictionIdRules), codes.copy);

// Picks contest
router.get('/contest', requireAuth, contest.state);
router.post('/contest/slips', requireAuth, contestLimiter, validate(submitSlipRules), contest.submit);
router.get('/contest/slips', requireAuth, contest.slips);
router.get('/contest/leaderboard', optionalAuth, validate(monthQuery), contest.leaderboard);
router.get('/contest/winners', contest.winners);
router.get('/promos', contest.promos);

// Crypto futures signals and Telegram alerts
router.get('/crypto-signals', requireAuth, validate(feedRules), crypto.feed);
router.get('/telegram', requireAuth, crypto.telegramStatus);
router.post('/telegram/link', requireAuth, contestLimiter, crypto.telegramLink);
router.delete('/telegram', requireAuth, crypto.telegramUnlink);

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
