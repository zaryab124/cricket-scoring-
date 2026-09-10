import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.js';
import { logger } from '../utils/logger.js';

export const recordAuditLog = (actionName?: string, entityName?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Intercept response finish
    const originalSend = res.send;
    res.send = function (body?: any): Response {
      res.send = originalSend;
      const result = originalSend.call(this, body);

      // Only log successful operations or if it's a mutation
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const action = actionName || `${req.method}_${req.baseUrl.replace('/api/v1/', '').toUpperCase()}`;
        const entity = entityName || req.baseUrl.replace('/api/v1/', '');
        const entityId = req.params.id || undefined;
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        let details: string | undefined;
        try {
          if (req.body && Object.keys(req.body).length > 0) {
            const sanitized = { ...req.body };
            delete sanitized.password;
            delete sanitized.passwordConfirm;
            details = JSON.stringify(sanitized);
          }
        } catch {
          // Ignore JSON parse errors
        }

        prisma.auditLog.create({
          data: {
            userId: req.user?.id || null,
            action,
            entity,
            entityId,
            ipAddress,
            userAgent,
            details,
          },
        }).catch((err) => {
          logger.warn(`Failed to record audit log: ${err.message}`);
        });
      }

      return result;
    };

    next();
  };
};
