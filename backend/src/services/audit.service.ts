import { prisma } from './prisma.js';
import { PaginationParams } from '../types/index.js';

export class AuditService {
  static async listAuditLogs(params: PaginationParams & { entity?: string; action?: string; userId?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.entity) where.entity = params.entity;
    if (params.action) where.action = { contains: params.action };
    if (params.userId) where.userId = params.userId;
    if (params.search) {
      where.OR = [
        { action: { contains: params.search } },
        { entity: { contains: params.search } },
        { ipAddress: { contains: params.search } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return { logs, total, page, limit };
  }
}
