import { Request, Response, NextFunction } from 'express';
import { RankingService } from '../services/ranking.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class StatsController {
  static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const format = req.query.format as string | undefined;
      const competitionId = req.query.competitionId as string | undefined;

      const [batting, bowling, allRounders] = await Promise.all([
        RankingService.calculateRankings({ category: 'BATTING', format, competitionId, limit: 5 }),
        RankingService.calculateRankings({ category: 'BOWLING', format, competitionId, limit: 5 }),
        RankingService.calculateRankings({ category: 'ALL_ROUNDER', format, competitionId, limit: 5 }),
      ]);

      sendSuccess(res, {
        topBatters: batting.rankings,
        topBowlers: bowling.rankings,
        topAllRounders: allRounders.rankings,
      }, 'Leaderboard rankings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getRankings(req: Request, res: Response, next: NextFunction) {
    try {
      const category = (req.query.category as 'BATTING' | 'BOWLING' | 'ALL_ROUNDER') || 'BATTING';
      const format = req.query.format as string | undefined;
      const competitionId = req.query.competitionId as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await RankingService.calculateRankings({
        category,
        format,
        competitionId,
        limit,
      });

      sendSuccess(res, result, 'Rankings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAdminDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await AnalyticsService.getAdminDashboardOverview();
      sendSuccess(res, overview, 'Admin analytics dashboard data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
