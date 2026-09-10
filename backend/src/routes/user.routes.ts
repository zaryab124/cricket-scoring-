import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { recordAuditLog } from '../middleware/auditLogger.js';
import { UpdateUserRoleSchema, UpdateUserStatusSchema, UpdateProfileSchema } from '../schemas/index.js';

const router = Router();

// Platform stats (Admin or Dashboard)
router.get(
  '/platform-stats',
  authenticate,
  UserController.getPlatformStats
);

// List users (Admin)
router.get(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'),
  UserController.listUsers
);

// Update own profile
router.patch(
  '/profile',
  authenticate,
  validateRequest(UpdateProfileSchema),
  recordAuditLog('USER_PROFILE_UPDATED', 'users'),
  UserController.updateProfile
);

// Get single user
router.get(
  '/:id',
  authenticate,
  UserController.getUserById
);

// Update user role (Super Admin only)
router.patch(
  '/:id/role',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  validateRequest(UpdateUserRoleSchema),
  recordAuditLog('USER_ROLE_UPDATED', 'users'),
  UserController.updateUserRole
);

// Update user status (Super Admin only)
router.patch(
  '/:id/status',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  validateRequest(UpdateUserStatusSchema),
  recordAuditLog('USER_STATUS_UPDATED', 'users'),
  UserController.updateUserStatus
);

export default router;
