import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  AuditController.listAuditLogs
);

export default router;
