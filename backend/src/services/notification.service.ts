import { prisma } from './prisma.js';
import { PaginationParams } from '../types/index.js';

export class NotificationService {
  static async listUserNotifications(userId: string, params: PaginationParams & { unreadOnly?: boolean }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (params.unreadOnly) {
      where.isRead = false;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { notifications, unreadCount, total, page, limit };
  }

  static async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  static async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    linkUrl?: string;
    metadata?: string;
  }) {
    return prisma.notification.create({
      data,
    });
  }
}
