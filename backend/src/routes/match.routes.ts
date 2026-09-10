import { Router } from 'express';
import { MatchController } from '../controllers/match.controller.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { recordAuditLog } from '../middleware/auditLogger.js';
import { CreateMatchSchema, RecordTossSchema, SetSquadsSchema } from '../schemas/index.js';

const router = Router();

router.get('/', optionalAuth, MatchController.listMatches);
router.get('/:id', optionalAuth, MatchController.getMatchById);
router.get('/:id/squads', optionalAuth, MatchController.getMatchSquads);
router.get('/:id/analytics', optionalAuth, AnalyticsController.getMatchAnalytics);

router.post(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'),
  validateRequest(CreateMatchSchema),
  recordAuditLog('MATCH_CREATED', 'matches'),
  MatchController.createMatch
);

router.patch(
  '/:id/status',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER'),
  recordAuditLog('MATCH_STATUS_UPDATED', 'matches'),
  MatchController.updateMatchStatus
);

router.post(
  '/:id/toss',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER'),
  validateRequest(RecordTossSchema),
  recordAuditLog('MATCH_TOSS_RECORDED', 'matches'),
  MatchController.recordToss
);

router.post(
  '/:id/squads',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER', 'TEAM_MANAGER'),
  validateRequest(SetSquadsSchema),
  recordAuditLog('MATCH_SQUADS_SET', 'matches'),
  MatchController.setSquads
);

export default router;

