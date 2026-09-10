import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

prisma.$connect()
  .then(() => {
    logger.info('Database connected successfully.');
  })
  .catch((err: unknown) => {
    logger.error(`Database connection failed: ${err instanceof Error ? err.message : String(err)}`);
  });
