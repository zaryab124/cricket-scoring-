import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';

export class UserController {
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { users, total, page, limit } = await UserService.listUsers(req.query as any);
      sendPaginated(res, users, total, page, limit, 'Users list retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getUserById(req.params.id);
      sendSuccess(res, user, 'User details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateUserRole(req.params.id, req.body.role, req.user!.id);
      sendSuccess(res, user, 'User role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateUserStatus(req.params.id, req.body.status);
      sendSuccess(res, user, 'User status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPlatformStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await UserService.getPlatformStats();
      sendSuccess(res, stats, 'Platform statistics retrieved');
    } catch (error) {
      next(error);
    }
  }
}
