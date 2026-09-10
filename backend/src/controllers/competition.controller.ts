import { Request, Response, NextFunction } from 'express';
import { CompetitionService } from '../services/competition.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/apiResponse.js';

export class CompetitionController {
  static async listCompetitions(req: Request, res: Response, next: NextFunction) {
    try {
      const { competitions, total, page, limit } = await CompetitionService.listCompetitions(req.query as any);
      sendPaginated(res, competitions, total, page, limit, 'Competitions list retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getCompetitionById(req: Request, res: Response, next: NextFunction) {
    try {
      const competition = await CompetitionService.getCompetitionById(req.params.id);
      sendSuccess(res, competition, 'Competition details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async createCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      const competition = await CompetitionService.createCompetition({
        ...req.body,
        organizerId: req.body.organizerId || req.user?.id,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      sendCreated(res, competition, 'Competition created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      const competition = await CompetitionService.updateCompetition(req.params.id, {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      sendSuccess(res, competition, 'Competition updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCompetitionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const competition = await CompetitionService.updateCompetitionStatus(req.params.id, req.body.status);
      sendSuccess(res, competition, 'Competition status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCompetitionTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const teams = await CompetitionService.getCompetitionTeams(req.params.id);
      sendSuccess(res, teams, 'Competition participating teams retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async addTeamToCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId, groupName, seed, status } = req.body;
      const team = await CompetitionService.addTeamToCompetition(req.params.id, teamId, groupName, seed, status);
      sendCreated(res, team, 'Team registered to competition successfully');
    } catch (error) {
      next(error);
    }
  }

  static async removeTeamFromCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      await CompetitionService.removeTeamFromCompetition(req.params.id, req.params.teamId);
      sendSuccess(res, null, 'Team removed from competition successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTournamentStandings(req: Request, res: Response, next: NextFunction) {
    try {
      const standings = await CompetitionService.getTournamentStandings(req.params.id);
      sendSuccess(res, standings, 'Tournament standings retrieved');
    } catch (error) {
      next(error);
    }
  }
}
