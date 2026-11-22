import { Router } from 'express';
import * as auth from '../../controllers/admin/auth.controller.js';
import * as siteConfig from '../../controllers/admin/siteConfig.controller.js';
import * as plans from '../../controllers/admin/plan.controller.js';
import * as users from '../../controllers/admin/user.controller.js';
import * as messages from '../../controllers/admin/message.controller.js';
import * as dashboard from '../../controllers/admin/dashboard.controller.js';
import * as billing from '../../controllers/admin/billing.controller.js';
import * as predictions from '../../controllers/admin/prediction.controller.js';
import * as account from '../../controllers/admin/account.controller.js';
import * as chat from '../../controllers/admin/chat.controller.js';
import * as signals from '../../controllers/admin/signal.controller.js';
import * as tips from '../../controllers/admin/tips.controller.js';
import * as codes from '../../controllers/admin/codes.controller.js';
import * as contest from '../../controllers/admin/contest.controller.js';
import { awardRules, contestConfigRules, exportRules, monthQuery, promoRules } from '../../validators/contest.validator.js';
import {
  codeResultRules, codesConfigRules, createCodeRules, selectionResultRules, tipSearchRules, updateCodeRules,
} from '../../validators/codes.validator.js';
import { leaguesRules, overrideRules, runTipsJobRules, tipsConfigRules } from '../../validators/tips.validator.js';
import { conversationListRules, messageRules, runJobRules, signalConfigRules } from '../../validators/chat.validator.js';
import { chatLimiter } from '../../middlewares/rateLimit.js';
import { changePasswordRules } from '../../validators/auth.validator.js';
import { requirePermission, requireStaff, requireSuperadmin } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { authLimiter } from '../../middlewares/rateLimit.js';
import { uploadImage } from '../../middlewares/upload.js';
import { loginRules } from '../../validators/auth.validator.js';
import { param } from 'express-validator';
import { createPlanRules, updatePlanRules } from '../../validators/plan.validator.js';
import { updateSiteConfigRules } from '../../validators/siteConfig.validator.js';
import {
  cancelSubscriptionRules, createStaffRules, grantPlanRules, updateUserRules,
} from '../../validators/staff.validator.js';
import { PERMISSIONS as P } from '../../utils/permissions.js';

const router = Router();

router.post('/auth/login', authLimiter, validate(loginRules), auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);

router.use(requireStaff);
router.get('/auth/me', auth.me);
router.patch('/account/password', validate(changePasswordRules), account.changePassword);
router.patch('/account/profile', account.updateProfile);

const id = validate([param('id').isMongoId().withMessage('Invalid id')]);

router.get('/dashboard', requirePermission(P.DASHBOARD_VIEW), dashboard.stats);
router.get('/health', dashboard.health);

router.get('/site-config', requirePermission(P.SETTINGS_MANAGE), siteConfig.show);
router.put('/site-config', requirePermission(P.SETTINGS_MANAGE), validate(updateSiteConfigRules), siteConfig.update);
router.post('/site-config/images/:field', requirePermission(P.SETTINGS_MANAGE), uploadImage.single('image'), siteConfig.uploadImage);

router.get('/plans', requirePermission(P.PLANS_MANAGE), plans.list);
router.post('/plans', requirePermission(P.PLANS_MANAGE), validate(createPlanRules), plans.create);
router.patch('/plans/:id', requirePermission(P.PLANS_MANAGE), id, validate(updatePlanRules), plans.update);
router.delete('/plans/:id', requirePermission(P.PLANS_MANAGE), id, plans.archive);

router.get('/users', requirePermission(P.USERS_VIEW), users.list);
router.get('/users/:id', requirePermission(P.USERS_VIEW), id, users.show);
router.patch('/users/:id', requirePermission(P.USERS_MANAGE), id, validate(updateUserRules), users.update);
router.post('/users/:id/grant', requirePermission(P.SUBSCRIPTIONS_MANAGE), id, validate(grantPlanRules), billing.grant);

router.get('/subscriptions', requirePermission(P.SUBSCRIPTIONS_VIEW), billing.subscriptions);
router.post('/subscriptions/:id/cancel', requirePermission(P.SUBSCRIPTIONS_MANAGE), id, validate(cancelSubscriptionRules), billing.cancelSubscription);
router.get('/payments', requirePermission(P.SUBSCRIPTIONS_VIEW), billing.payments);

router.get('/predictions', requirePermission(P.PREDICTIONS_MANAGE), predictions.list);
router.get('/predictions/:id', requirePermission(P.PREDICTIONS_MANAGE), id, predictions.show);
router.get('/signals', requirePermission(P.PREDICTIONS_MANAGE), signals.list);
router.get('/signals/config', requirePermission(P.PREDICTIONS_MANAGE), signals.config);
router.put('/signals/config', requirePermission(P.PREDICTIONS_MANAGE), validate(signalConfigRules), signals.updateConfig);
router.get('/signals/runs', requirePermission(P.PREDICTIONS_MANAGE), signals.runs);
router.post('/signals/run', requirePermission(P.PREDICTIONS_MANAGE), validate(runJobRules), signals.runNow);

const tipsPerm = requirePermission(P.TIPS_MANAGE);
router.get('/tips', tipsPerm, tips.list);
router.get('/tips/stats', tipsPerm, tips.stats);
router.get('/tips/odds-report', tipsPerm, tips.oddsReport);
router.get('/tips/config', tipsPerm, tips.config);
router.put('/tips/config', tipsPerm, validate(tipsConfigRules), tips.updateConfig);
router.get('/tips/leagues', tipsPerm, validate(leaguesRules), tips.leagues);
router.get('/tips/runs', tipsPerm, tips.runs);
router.post('/tips/run', tipsPerm, validate(runTipsJobRules), tips.runNow);
router.post('/tips/:id/result', tipsPerm, validate(overrideRules), tips.override);

const codesPerm = requirePermission(P.CODES_MANAGE);
router.get('/codes', codesPerm, codes.list);
router.get('/codes/stats', codesPerm, codes.stats);
router.get('/codes/config', codesPerm, codes.config);
router.put('/codes/config', codesPerm, validate(codesConfigRules), codes.updateConfig);
router.get('/codes/tip-options', codesPerm, validate(tipSearchRules), codes.tipOptions);
router.post('/codes', codesPerm, validate(createCodeRules), codes.create);
router.patch('/codes/:id', codesPerm, validate(updateCodeRules), codes.update);
router.delete('/codes/:id', codesPerm, id, codes.withdraw);
router.post('/codes/:id/result', codesPerm, validate(codeResultRules), codes.setResult);
router.post('/codes/:id/selections/:index/result', codesPerm, validate(selectionResultRules), codes.setSelectionResult);

const contestPerm = requirePermission(P.CONTEST_MANAGE);
router.get('/contest/config', contestPerm, contest.config);
router.put('/contest/config', contestPerm, validate(contestConfigRules), contest.updateConfig);
router.get('/contest/leaderboard', contestPerm, validate(monthQuery), contest.leaderboard);
router.post('/contest/months/:month/rewards', contestPerm, validate(awardRules), contest.award);
router.get('/contest/rewards', contestPerm, contest.rewards);
router.post('/contest/rewards/:id/paid', contestPerm, id, contest.markPaid);
router.get('/contest/export', contestPerm, validate(exportRules), contest.exportCsv);
router.get('/promos', contestPerm, contest.promos);
router.post('/promos', contestPerm, contest.createPromo);
router.patch('/promos/:id', contestPerm, validate(promoRules), contest.updatePromo);
router.post('/promos/:id/image', contestPerm, id, uploadImage.single('image'), contest.uploadPromoImage);

const chatPerm = requirePermission(P.CHAT_RESPOND);
router.get('/chat/conversations', chatPerm, validate(conversationListRules), chat.list);
router.get('/chat/conversations/:id', chatPerm, id, chat.show);
router.post('/chat/conversations/:id/messages', chatPerm, chatLimiter, id, validate(messageRules), chat.send);
router.post('/chat/conversations/:id/read', chatPerm, id, chat.read);
router.post('/chat/conversations/:id/assign', chatPerm, id, chat.assign);
router.post('/chat/conversations/:id/close', chatPerm, id, chat.close);

router.post('/staff', requireSuperadmin, validate(createStaffRules), users.createStaff);

router.get('/messages', requirePermission(P.MESSAGES_VIEW), messages.list);
router.patch('/messages/:id', requirePermission(P.MESSAGES_VIEW), id, messages.updateStatus);

export default router;
