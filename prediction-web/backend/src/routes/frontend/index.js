import { Router } from 'express';
import * as auth from '../../controllers/frontend/auth.controller.js';
import * as account from '../../controllers/frontend/account.controller.js';
import * as pub from '../../controllers/frontend/public.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { authLimiter, contactLimiter } from '../../middlewares/rateLimit.js';
import { uploadImage } from '../../middlewares/upload.js';
import {
  changePasswordRules, loginRules, registerRules, updateProfileRules,
} from '../../validators/auth.validator.js';
import { contactRules } from '../../validators/contact.validator.js';

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

export default router;
