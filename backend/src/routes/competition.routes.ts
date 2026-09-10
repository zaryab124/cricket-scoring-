import { Router } from 'express';
import { CompetitionController } from '../controllers/competition.controller.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { recordAuditLog } from '../middleware/auditLogger.js';
import {
  CreateCompetitionSchema,
  UpdateCompetitionSchema,
  UpdateCompetitionStatusSchema,
  AddCompetitionTeamSchema,
} from '../schemas/index.js';

const router = Router();

router.get('/', optionalAuth, CompetitionController.listCompetitions);
router.get('/:id', optionalAuth, CompetitionController.getCompetitionById);
router.get('/:id/teams', optionalAuth, CompetitionController.getCompetitionTeams);
router.get('/:id/standings', optionalAuth, CompetitionController.getTournamentStandings);
router.get('/:id/analytics', optionalAuth, AnalyticsController.getTournamentAnalytics);

router.post(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'),
  validateRequest(CreateCompetitionSchema),
  recordAuditLog('COMPETITION_CREATED', 'competitions'),
  CompetitionController.createCompetition
);

router.put(
  '/:id',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'),
  validateRequest(UpdateCompetitionSchema),
  recordAuditLog('COMPETITION_UPDATED', 'competitions'),
  CompetitionController.updateCompetition
);

router.patch(
  '/:id/status',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'),
  validateRequest(UpdateCompetitionStatusSchema),
  recordAuditLog('COMPETITION_STATUS_UPDATED', 'competitions'),
  CompetitionController.updateCompetitionStatus
);

router.post(
  '/:id/teams',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'),
  validateRequest(AddCompetitionTeamSchema),
  recordAuditLog('COMPETITION_TEAM_ADDED', 'competitions'),
  CompetitionController.addTeamToCompetition
);

router.delete(
  '/:id/teams/:teamId',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'),
  recordAuditLog('COMPETITION_TEAM_REMOVED', 'competitions'),
  CompetitionController.removeTeamFromCompetition
);

export default router;

