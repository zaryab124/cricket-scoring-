import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get(
  '/',
  authenticate,
  NotificationController.listMyNotifications
);

router.patch(
  '/:id/read',
  authenticate,
  NotificationController.markAsRead
);

router.post(
  '/read-all',
  authenticate,
  NotificationController.markAllAsRead
);

export default router;
