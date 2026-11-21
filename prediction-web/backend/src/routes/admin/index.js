import { Router } from 'express';
import * as auth from '../../controllers/admin/auth.controller.js';
import * as siteConfig from '../../controllers/admin/siteConfig.controller.js';
import * as plans from '../../controllers/admin/plan.controller.js';
import * as users from '../../controllers/admin/user.controller.js';
import * as messages from '../../controllers/admin/message.controller.js';
import { requirePermission, requireStaff, requireSuperadmin } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { authLimiter } from '../../middlewares/rateLimit.js';
import { uploadImage } from '../../middlewares/upload.js';
import { loginRules } from '../../validators/auth.validator.js';
import { createPlanRules, updatePlanRules } from '../../validators/plan.validator.js';
import { updateSiteConfigRules } from '../../validators/siteConfig.validator.js';
import { createStaffRules, updateUserRules } from '../../validators/staff.validator.js';
import { PERMISSIONS as P } from '../../utils/permissions.js';

const router = Router();

router.post('/auth/login', authLimiter, validate(loginRules), auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);

router.use(requireStaff);
router.get('/auth/me', auth.me);

router.get('/site-config', requirePermission(P.SETTINGS_MANAGE), siteConfig.show);
router.put('/site-config', requirePermission(P.SETTINGS_MANAGE), validate(updateSiteConfigRules), siteConfig.update);
router.post('/site-config/images/:field', requirePermission(P.SETTINGS_MANAGE), uploadImage.single('image'), siteConfig.uploadImage);

router.get('/plans', requirePermission(P.PLANS_MANAGE), plans.list);
router.post('/plans', requirePermission(P.PLANS_MANAGE), validate(createPlanRules), plans.create);
router.patch('/plans/:id', requirePermission(P.PLANS_MANAGE), validate(updatePlanRules), plans.update);
router.delete('/plans/:id', requirePermission(P.PLANS_MANAGE), plans.archive);

router.get('/users', requirePermission(P.USERS_VIEW), users.list);
router.get('/users/:id', requirePermission(P.USERS_VIEW), users.show);
router.patch('/users/:id', requirePermission(P.USERS_MANAGE), validate(updateUserRules), users.update);
router.post('/staff', requireSuperadmin, validate(createStaffRules), users.createStaff);

router.get('/messages', requirePermission(P.MESSAGES_VIEW), messages.list);
router.patch('/messages/:id', requirePermission(P.MESSAGES_VIEW), messages.updateStatus);

export default router;
