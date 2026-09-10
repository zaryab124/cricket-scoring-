import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';

export class NotificationController {
  static async listMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { notifications, unreadCount, total, page, limit } = await NotificationService.listUserNotifications(
        req.user!.id,
        req.query as any
      );
      sendPaginated(res, notifications, total, page, limit, 'Notifications retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.markAsRead(req.params.id, req.user!.id);
      sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.markAllAsRead(req.user!.id);
      sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
