import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';

const router = Router();

router.get('/leaderboard', optionalAuth, StatsController.getLeaderboard);
router.get('/rankings', optionalAuth, StatsController.getRankings);
router.get(
  '/admin-dashboard',
  authenticate,
  requireRoles('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'),
  StatsController.getAdminDashboard
);

export default router;
