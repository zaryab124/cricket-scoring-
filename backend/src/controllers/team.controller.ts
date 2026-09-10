import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/team.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';

export class TeamController {
  static async listTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const { teams, total, page, limit } = await TeamService.listTeams(req.query as any);
      sendPaginated(res, teams, total, page, limit, 'Teams list retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getTeamById(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await TeamService.getTeamById(req.params.id);
      sendSuccess(res, team, 'Team details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async createTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await TeamService.createTeam({
        ...req.body,
        managerId: req.body.managerId || req.user?.id,
      });
      sendCreated(res, team, 'Team created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateTeam(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'TEAM_MANAGER') {
        const team = await TeamService.getTeamById(req.params.id);
        if (!team || team.managerId !== req.user.id) {
          throw AppError.forbidden('You can only manage your assigned team squad');
        }
      }
      const team = await TeamService.updateTeam(req.params.id, req.body);
      sendSuccess(res, team, 'Team details updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'TEAM_MANAGER') {
        const team = await TeamService.getTeamById(req.params.id);
        if (!team || team.managerId !== req.user.id) {
          throw AppError.forbidden('You can only manage your assigned team squad');
        }
      }
      const { playerId, role, jerseyNumber, isCaptain, isViceCaptain, isWicketKeeper } = req.body;
      const member = await TeamService.addMember(
        req.params.id,
        playerId,
        role,
        jerseyNumber,
        isCaptain,
        isViceCaptain,
        isWicketKeeper
      );
      sendSuccess(res, member, 'Player added to team squad');
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRoles(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'TEAM_MANAGER') {
        const team = await TeamService.getTeamById(req.params.id);
        if (!team || team.managerId !== req.user.id) {
          throw AppError.forbidden('You can only manage your assigned team squad');
        }
      }
      const member = await TeamService.updateMemberRoles(req.params.id, req.params.playerId, req.body);
      sendSuccess(res, member, 'Team member roles updated');
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'TEAM_MANAGER') {
        const team = await TeamService.getTeamById(req.params.id);
        if (!team || team.managerId !== req.user.id) {
          throw AppError.forbidden('You can only manage your assigned team squad');
        }
      }
      await TeamService.removeMember(req.params.id, req.params.playerId);
      sendSuccess(res, null, 'Player removed from team squad');
    } catch (error) {
      next(error);
    }
  }

  static async getSquadHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await TeamService.getSquadHistory(req.params.id);
      sendSuccess(res, history, 'Team squad history retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getTeamStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await TeamService.getTeamStats(req.params.id);
      sendSuccess(res, stats, 'Team match statistics retrieved');
    } catch (error) {
      next(error);
    }
  }
}

