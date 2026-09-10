import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import playerRoutes from './player.routes.js';
import teamRoutes from './team.routes.js';
import matchRoutes from './match.routes.js';
import competitionRoutes from './competition.routes.js';
import scoringRoutes from './scoring.routes.js';
import statsRoutes from './stats.routes.js';
import auditRoutes from './audit.routes.js';
import notificationRoutes from './notification.routes.js';
import searchRoutes from './search.routes.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

// Platform Health Check
router.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'CONNECTED';
  try {
    const { prisma } = await import('../services/prisma.js');
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch {
    dbStatus = 'DISCONNECTED';
  }

  sendSuccess(
    res,
    {
      status: dbStatus === 'CONNECTED' ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      service: 'Cricket Master API Engine',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      database: dbStatus,
    },
    'Service healthy'
  );
});

// Mount Resource Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/players', playerRoutes);
router.use('/teams', teamRoutes);
router.use('/matches', matchRoutes);
router.use('/tournaments', competitionRoutes);
router.use('/competitions', competitionRoutes);
router.use('/scoring', scoringRoutes);
router.use('/stats', statsRoutes);
router.use('/search', searchRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/notifications', notificationRoutes);

export default router;
