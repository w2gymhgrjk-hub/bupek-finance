import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { env } from '../../config/env';
import {
  loginValidation, forgotPasswordValidation,
  resetPasswordValidation, changePasswordValidation,
} from './auth.validation';

const router = Router();
const ctrl = new AuthController();

const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip || 'unknown',
});

router.post('/login', loginLimiter, loginValidation, (req, res) => ctrl.login(req, res));
router.post('/refresh', (req, res) => ctrl.refresh(req, res));
router.post('/logout', authenticate, auditLog({ action: 'LOGOUT', module: 'auth' }), (req, res) => ctrl.logout(req as any, res));
router.post('/forgot-password', forgotPasswordValidation, (req, res) => ctrl.forgotPassword(req, res));
router.post('/reset-password', resetPasswordValidation, (req, res) => ctrl.resetPassword(req, res));
router.post('/change-password', authenticate, changePasswordValidation,
  auditLog({ action: 'CHANGE_PASSWORD', module: 'auth' }),
  (req, res) => ctrl.changePassword(req as any, res));

export default router;