import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class AnalyticsController {
  static async getMatchAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const matchId = req.params.id;
      const analytics = await AnalyticsService.getMatchAnalytics(matchId);
      sendSuccess(res, analytics, 'Match analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPlayerAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const playerId = req.params.id;
      const format = req.query.format as string | undefined;
      const competitionId = req.query.competitionId as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const analytics = await AnalyticsService.getPlayerAnalytics(playerId, {
        format,
        competitionId,
        limit,
      });

      sendSuccess(res, analytics, 'Player performance analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTournamentAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const competitionId = req.params.id;
      const analytics = await AnalyticsService.getTournamentAnalytics(competitionId);
      sendSuccess(res, analytics, 'Tournament analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAdminDashboardOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await AnalyticsService.getAdminDashboardOverview();
      sendSuccess(res, overview, 'Admin intelligence dashboard overview retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
