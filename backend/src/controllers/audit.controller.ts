import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service.js';
import { sendPaginated } from '../utils/apiResponse.js';

export class AuditController {
  static async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { logs, total, page, limit } = await AuditService.listAuditLogs(req.query as any);
      sendPaginated(res, logs, total, page, limit, 'Audit logs retrieved');
    } catch (error) {
      next(error);
    }
  }
}
