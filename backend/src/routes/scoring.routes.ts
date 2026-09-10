import { Router } from 'express';
import { ScoringController } from '../controllers/scoring.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validate.js';
import { recordAuditLog } from '../middleware/auditLogger.js';
import {
  StartInningsSchema,
  RecordBallSchema,
  ChangeBowlerSchema,
  SetNewBatsmanSchema,
  CompleteInningsSchema,
} from '../schemas/index.js';

const router = Router();

// Spectator & Public Scorecard Endpoints
router.get('/:matchId/scorecard', optionalAuth, ScoringController.getMatchScorecard);
router.get('/:matchId/live-stream', optionalAuth, ScoringController.streamMatchEvents);

// Scorer Operations
router.post(
  '/:matchId/start-innings',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER'),
  validateRequest(StartInningsSchema),
  recordAuditLog('INNINGS_STARTED', 'innings'),
  ScoringController.startInnings
);

router.post(
  '/:matchId/ball',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER'),
  validateRequest(RecordBallSchema),
  recordAuditLog('BALL_EVENT_RECORDED', 'ball_events'),
  ScoringController.recordBall
);

router.post(
  '/:matchId/undo',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER'),
  recordAuditLog('BALL_EVENT_UNDONE', 'ball_events'),
  ScoringController.undoLastBall
);

router.post(
  '/:matchId/bowler',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER'),
  validateRequest(ChangeBowlerSchema),
  recordAuditLog('BOWLER_CHANGED', 'innings'),
  ScoringController.changeBowler
);

router.post(
  '/:matchId/batsman',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER'),
  validateRequest(SetNewBatsmanSchema),
  recordAuditLog('BATSMAN_CHANGED', 'innings'),
  ScoringController.setNewBatsman
);

router.post(
  '/:matchId/complete-innings',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER'),
  validateRequest(CompleteInningsSchema),
  recordAuditLog('INNINGS_COMPLETED', 'innings'),
  ScoringController.completeInnings
);

export default router;

