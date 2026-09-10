import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { recordAuditLog } from '../middleware/auditLogger.js';
import { CreatePlayerSchema, UpdatePlayerSchema } from '../schemas/index.js';

const router = Router();

router.get('/', optionalAuth, PlayerController.listPlayers);
router.get('/:id', optionalAuth, PlayerController.getPlayerById);
router.get('/:id/stats', optionalAuth, PlayerController.getPlayerStats);
router.get('/:id/analytics', optionalAuth, AnalyticsController.getPlayerAnalytics);

router.post(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TEAM_MANAGER', 'TOURNAMENT_ADMIN'),
  validateRequest(CreatePlayerSchema),
  recordAuditLog('PLAYER_CREATED', 'players'),
  PlayerController.createPlayer
);

router.patch(
  '/:id',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TEAM_MANAGER', 'PLAYER'),
  validateRequest(UpdatePlayerSchema),
  recordAuditLog('PLAYER_UPDATED', 'players'),
  PlayerController.updatePlayer
);

export default router;

