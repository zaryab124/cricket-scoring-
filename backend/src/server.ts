import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './services/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`=======================================================`);
  logger.info(`🏏 Cricket Master API Server running on port ${config.port}`);
  logger.info(`🏏 Environment: ${config.env}`);
  logger.info(`🏏 Health Check: http://localhost:${config.port}/api/v1/health`);
  logger.info(`=======================================================`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database connection pool disconnected.');
    process.exit(0);
  });

  // Force close after 10s if hung
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  logger.error(`Unhandled Rejection: ${reason?.message || reason}`);
});

process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
