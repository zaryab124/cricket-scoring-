import { Request, Response, NextFunction } from 'express';
import { MatchService } from '../services/match.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/apiResponse.js';

export class MatchController {
  static async listMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { matches, total, page, limit } = await MatchService.listMatches(req.query as any);
      sendPaginated(res, matches, total, page, limit, 'Matches list retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getMatchById(req: Request, res: Response, next: NextFunction) {
    try {
      const match = await MatchService.getMatchById(req.params.id);
      sendSuccess(res, match, 'Match details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async createMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const match = await MatchService.createMatch({
        ...req.body,
        matchDate: new Date(req.body.matchDate),
      });
      sendCreated(res, match, 'Match fixture created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateMatchStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const match = await MatchService.updateMatchStatus(req.params.id, req.body);
      sendSuccess(res, match, 'Match status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async recordToss(req: Request, res: Response, next: NextFunction) {
    try {
      const match = await MatchService.recordToss(req.params.id, req.body);
      sendSuccess(res, match, 'Match toss recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async setSquads(req: Request, res: Response, next: NextFunction) {
    try {
      const squads = await MatchService.setSquads(req.params.id, req.body);
      sendSuccess(res, squads, 'Match squads and Playing XI updated');
    } catch (error) {
      next(error);
    }
  }

  static async getMatchSquads(req: Request, res: Response, next: NextFunction) {
    try {
      const squads = await MatchService.getMatchSquads(req.params.id);
      sendSuccess(res, squads, 'Match squads retrieved');
    } catch (error) {
      next(error);
    }
  }
}

