import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { recordAuditLog } from '../middleware/auditLogger.js';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '../schemas/index.js';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validateRequest(RegisterSchema),
  recordAuditLog('USER_REGISTERED', 'users'),
  AuthController.register
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest(LoginSchema),
  recordAuditLog('USER_LOGGED_IN', 'users'),
  AuthController.login
);

router.post(
  '/refresh-token',
  validateRequest(RefreshTokenSchema),
  AuthController.refreshToken
);

router.post(
  '/logout',
  authenticate,
  recordAuditLog('USER_LOGGED_OUT', 'users'),
  AuthController.logout
);

router.get(
  '/me',
  authenticate,
  AuthController.getMe
);

export default router;
