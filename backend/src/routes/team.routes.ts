import { Router } from 'express';
import { TeamController } from '../controllers/team.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { recordAuditLog } from '../middleware/auditLogger.js';
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  AddTeamMemberSchema,
  UpdateTeamMemberRolesSchema,
} from '../schemas/index.js';

const router = Router();

router.get('/', optionalAuth, TeamController.listTeams);
router.get('/:id', optionalAuth, TeamController.getTeamById);
router.get('/:id/stats', optionalAuth, TeamController.getTeamStats);
router.get('/:id/history', optionalAuth, TeamController.getSquadHistory);

router.post(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'TEAM_MANAGER'),
  validateRequest(CreateTeamSchema),
  recordAuditLog('TEAM_CREATED', 'teams'),
  TeamController.createTeam
);

router.patch(
  '/:id',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TEAM_MANAGER'),
  validateRequest(UpdateTeamSchema),
  recordAuditLog('TEAM_UPDATED', 'teams'),
  TeamController.updateTeam
);

router.post(
  '/:id/members',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TEAM_MANAGER'),
  validateRequest(AddTeamMemberSchema),
  recordAuditLog('TEAM_MEMBER_ADDED', 'teams'),
  TeamController.addMember
);

router.patch(
  '/:id/members/:playerId/roles',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TEAM_MANAGER'),
  validateRequest(UpdateTeamMemberRolesSchema),
  recordAuditLog('TEAM_MEMBER_ROLES_UPDATED', 'teams'),
  TeamController.updateMemberRoles
);

router.delete(
  '/:id/members/:playerId',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TEAM_MANAGER'),
  recordAuditLog('TEAM_MEMBER_REMOVED', 'teams'),
  TeamController.removeMember
);

export default router;

