import { Request, Response, NextFunction } from 'express';
import { PlayerService } from '../services/player.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';

export class PlayerController {
  static async listPlayers(req: Request, res: Response, next: NextFunction) {
    try {
      const { players, total, page, limit } = await PlayerService.listPlayers(req.query as any);
      sendPaginated(res, players, total, page, limit, 'Players list retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getPlayerById(req: Request, res: Response, next: NextFunction) {
    try {
      const player = await PlayerService.getPlayerById(req.params.id);
      sendSuccess(res, player, 'Player profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async createPlayer(req: Request, res: Response, next: NextFunction) {
    try {
      const player = await PlayerService.createPlayer(req.body);
      sendCreated(res, player, 'Player profile created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updatePlayer(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'PLAYER') {
        const playerProfile = await PlayerService.getPlayerById(req.params.id);
        if (!playerProfile || playerProfile.userId !== req.user.id) {
          throw AppError.forbidden('You can only update your own player profile');
        }
      }
      const player = await PlayerService.updatePlayer(req.params.id, req.body);
      sendSuccess(res, player, 'Player profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPlayerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await PlayerService.computeCareerStats(req.params.id);
      sendSuccess(res, stats, 'Player career statistics retrieved');
    } catch (error) {
      next(error);
    }
  }
}

