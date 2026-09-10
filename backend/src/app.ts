import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import v1Routes from './routes/index.js';
import { AppError } from './utils/appError.js';
import { logger } from './utils/logger.js';

export const createApp = () => {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  app.use(
    cors({
      origin: config.cors.origin === '*' ? '*' : config.cors.origin.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Request Rate Limiting
  app.use(apiRateLimiter);

  // Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP Request Logging
  const morganStream = {
    write: (message: string) => logger.http(message.trim()),
  };
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

  // Health and Readiness Probes (Root level for Kubernetes / Docker / Load Balancers)
  app.get('/health', async (_req, res) => {
    try {
      await import('./services/prisma.js').then((m) => m.prisma.$queryRawUnsafe('SELECT 1'));
      res.json({
        status: 'UP',
        service: 'Cricket Master API Engine',
        version: '1.0.0',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: 'CONNECTED',
      });
    } catch {
      res.status(503).json({
        status: 'DEGRADED',
        service: 'Cricket Master API Engine',
        database: 'DISCONNECTED',
      });
    }
  });

  app.get('/health/live', (_req, res) => {
    res.json({ status: 'LIVE', uptimeSeconds: Math.floor(process.uptime()) });
  });

  app.get('/health/ready', async (_req, res) => {
    try {
      await import('./services/prisma.js').then((m) => m.prisma.$queryRawUnsafe('SELECT 1'));
      res.json({ status: 'READY', database: 'CONNECTED' });
    } catch {
      res.status(503).json({ status: 'NOT_READY', database: 'DISCONNECTED' });
    }
  });

  // Root Welcome Route
  app.get('/', (_req, res) => {
    res.json({
      name: 'Cricket Management & Live Scoring Platform API',
      version: '1.0.0',
      status: 'ONLINE',
      docs: '/api/v1/health',
      probes: {
        health: '/health',
        ready: '/health/ready',
        live: '/health/live',
      },
    });
  });

  // API Version 1 Routes
  app.use('/api/v1', v1Routes);

  // 404 Route Not Found Handler
  app.use('*', (req, _res, next) => {
    next(AppError.notFound(`Route ${req.originalUrl} not found on this server`, undefined, 'ROUTE_NOT_FOUND'));
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};
