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
router.post('/staff', requireSuperadmin, validate(createStaffRules), users.createStaff);

router.get('/messages', requirePermission(P.MESSAGES_VIEW), messages.list);
router.patch('/messages/:id', requirePermission(P.MESSAGES_VIEW), id, messages.updateStatus);

export default router;
