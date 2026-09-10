import { prisma } from './prisma.js';
import { AppError } from '../utils/appError.js';
import { MatchStatus, MatchFormat, TossDecision, PaginationParams } from '../types/index.js';

export interface CreateMatchDto {
  competitionId?: string;
  seasonId?: string;
  matchNumber?: number;
  title?: string;
  format: MatchFormat;
  oversLimit?: number;
  venue: string;
  city?: string;
  matchDate: Date;
  homeTeamId: string;
  awayTeamId: string;
  scorerId?: string;
}

export class MatchService {
  static async listMatches(params: PaginationParams & { status?: MatchStatus; competitionId?: string; teamId?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.competitionId) where.competitionId = params.competitionId;
    if (params.teamId) {
      where.OR = [
        { homeTeamId: params.teamId },
        { awayTeamId: params.teamId },
      ];
    }
    if (params.search) {
      where.OR = [
        { venue: { contains: params.search } },
        { title: { contains: params.search } },
        { homeTeam: { name: { contains: params.search } } },
        { awayTeam: { name: { contains: params.search } } },
      ];
    }

    const [total, matches] = await Promise.all([
      prisma.match.count({ where }),
      prisma.match.findMany({
        where,
        skip,
        take: limit,
        orderBy: { matchDate: 'asc' },
        include: {
          homeTeam: {
            select: { id: true, name: true, shortName: true, code: true, logoUrl: true },
          },
          awayTeam: {
            select: { id: true, name: true, shortName: true, code: true, logoUrl: true },
          },
          competition: {
            select: { id: true, name: true, code: true, type: true },
          },
          winner: {
            select: { id: true, name: true, shortName: true },
          },
          innings: {
            select: {
              id: true,
              inningsNumber: true,
              totalRuns: true,
              wickets: true,
              overs: true,
              battingTeamId: true,
            },
          },
        },
      }),
    ]);

    return { matches, total, page, limit };
  }

  static async getMatchById(id: string) {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: {
          include: {
            members: {
              where: { isActive: true },
              include: { player: true },
            },
          },
        },
        awayTeam: {
          include: {
            members: {
              where: { isActive: true },
              include: { player: true },
            },
          },
        },
        competition: true,
        season: true,
        tossWinner: true,
        winner: true,
        scorer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        innings: {
          include: {
            ballEvents: {
              take: 36, // last 6 overs of commentary / balls
              orderBy: { timestamp: 'desc' },
              include: {
                batsman: true,
                bowler: true,
                dismissedPlayer: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      throw AppError.notFound('Match not found');
    }

    return match;
  }

  static async createMatch(dto: CreateMatchDto) {
    if (dto.homeTeamId === dto.awayTeamId) {
      throw AppError.badRequest('Home team and Away team cannot be the same');
    }

    const [homeTeam, awayTeam] = await Promise.all([
      prisma.team.findUnique({ where: { id: dto.homeTeamId } }),
      prisma.team.findUnique({ where: { id: dto.awayTeamId } }),
    ]);

    if (!homeTeam || !awayTeam) {
      throw AppError.notFound('One or both selected teams do not exist');
    }

    return prisma.match.create({
      data: {
        competitionId: dto.competitionId,
        seasonId: dto.seasonId,
        matchNumber: dto.matchNumber,
        title: dto.title || `${homeTeam.shortName} vs ${awayTeam.shortName}`,
        format: dto.format || 'T20',
        oversLimit: dto.oversLimit || 20,
        venue: dto.venue,
        city: dto.city,
        matchDate: dto.matchDate,
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        scorerId: dto.scorerId,
        status: 'SCHEDULED',
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        competition: true,
      },
    });
  }

  static async updateMatchStatus(
    id: string,
    data: {
      status: MatchStatus;
      tossWinnerId?: string;
      tossDecision?: TossDecision;
      winnerId?: string;
      winMargin?: number;
      winType?: string;
      resultSummary?: string;
    }
  ) {
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) throw AppError.notFound('Match not found');

    return prisma.match.update({
      where: { id },
      data,
      include: {
        homeTeam: true,
        awayTeam: true,
        winner: true,
      },
    });
  }

  static async recordToss(matchId: string, dto: { tossWinnerId: string; tossDecision: TossDecision }) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) throw AppError.notFound('Match not found');

    if (['COMPLETED', 'ABANDONED', 'NO_RESULT'].includes(match.status)) {
      throw AppError.badRequest('Cannot record toss for a match that is already finished or abandoned');
    }

    if (dto.tossWinnerId !== match.homeTeamId && dto.tossWinnerId !== match.awayTeamId) {
      throw AppError.badRequest('Toss winner must be one of the competing teams');
    }

    if (dto.tossDecision !== 'BAT' && dto.tossDecision !== 'BOWL') {
      throw AppError.badRequest('Toss decision must be BAT or BOWL');
    }

    const tossWinnerTeam = dto.tossWinnerId === match.homeTeamId ? match.homeTeam : match.awayTeam;
    const decisionText = dto.tossDecision === 'BAT' ? 'bat first' : 'bowl first';
    const resultSummary = `${tossWinnerTeam.name} won the toss and elected to ${decisionText}.`;

    return prisma.match.update({
      where: { id: matchId },
      data: {
        tossWinnerId: dto.tossWinnerId,
        tossDecision: dto.tossDecision,
        status: match.status === 'SCHEDULED' ? 'TOSS_COMPLETED' : match.status,
        resultSummary: match.status === 'SCHEDULED' ? resultSummary : match.resultSummary,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        tossWinner: true,
      },
    });
  }

  static async setSquads(
    matchId: string,
    dto: {
      homeTeamSquad?: Array<{
        playerId: string;
        isPlayingXI?: boolean;
        isCaptain?: boolean;
        isViceCaptain?: boolean;
        isWicketKeeper?: boolean;
        battingOrder?: number;
      }>;
      awayTeamSquad?: Array<{
        playerId: string;
        isPlayingXI?: boolean;
        isCaptain?: boolean;
        isViceCaptain?: boolean;
        isWicketKeeper?: boolean;
        battingOrder?: number;
      }>;
      players?: Array<{
        teamId: string;
        playerId: string;
        isPlayingXI?: boolean;
        isCaptain?: boolean;
        isViceCaptain?: boolean;
        isWicketKeeper?: boolean;
        battingOrder?: number;
      }>;
    }
  ) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) throw AppError.notFound('Match not found');

    if (['LIVE', 'INNINGS_BREAK', 'SUPER_OVER', 'COMPLETED', 'ABANDONED', 'NO_RESULT'].includes(match.status)) {
      throw AppError.badRequest('Cannot modify squads/Playing XI once match is in progress or completed');
    }

    const selections: Array<{
      teamId: string;
      playerId: string;
      isPlayingXI: boolean;
      isCaptain?: boolean;
      isViceCaptain?: boolean;
      isWicketKeeper?: boolean;
      battingOrder?: number;
    }> = [];

    if (dto.homeTeamSquad) {
      dto.homeTeamSquad.forEach((p, idx) => {
        selections.push({
          teamId: match.homeTeamId,
          playerId: p.playerId,
          isPlayingXI: p.isPlayingXI !== undefined ? p.isPlayingXI : true,
          isCaptain: p.isCaptain || false,
          isViceCaptain: p.isViceCaptain || false,
          isWicketKeeper: p.isWicketKeeper || false,
          battingOrder: p.battingOrder || idx + 1,
        });
      });
    }

    if (dto.awayTeamSquad) {
      dto.awayTeamSquad.forEach((p, idx) => {
        selections.push({
          teamId: match.awayTeamId,
          playerId: p.playerId,
          isPlayingXI: p.isPlayingXI !== undefined ? p.isPlayingXI : true,
          isCaptain: p.isCaptain || false,
          isViceCaptain: p.isViceCaptain || false,
          isWicketKeeper: p.isWicketKeeper || false,
          battingOrder: p.battingOrder || idx + 1,
        });
      });
    }

    if (dto.players) {
      dto.players.forEach((p, idx) => {
        selections.push({
          teamId: p.teamId,
          playerId: p.playerId,
          isPlayingXI: p.isPlayingXI !== undefined ? p.isPlayingXI : true,
          isCaptain: p.isCaptain || false,
          isViceCaptain: p.isViceCaptain || false,
          isWicketKeeper: p.isWicketKeeper || false,
          battingOrder: p.battingOrder || idx + 1,
        });
      });
    }

    // Validate Playing XI count per team
    const homeXI = selections.filter((s) => s.teamId === match.homeTeamId && s.isPlayingXI);
    const awayXI = selections.filter((s) => s.teamId === match.awayTeamId && s.isPlayingXI);

    if (homeXI.length > 11) {
      throw AppError.badRequest(`Home team cannot have more than 11 players in Playing XI (received ${homeXI.length})`);
    }
    if (awayXI.length > 11) {
      throw AppError.badRequest(`Away team cannot have more than 11 players in Playing XI (received ${awayXI.length})`);
    }

    // Save or update match selections
    for (const sel of selections) {
      await prisma.matchPlayer.upsert({
        where: {
          matchId_playerId: { matchId, playerId: sel.playerId },
        },
        update: {
          teamId: sel.teamId,
          isPlayingXI: sel.isPlayingXI,
          isCaptain: sel.isCaptain,
          isViceCaptain: sel.isViceCaptain,
          isWicketKeeper: sel.isWicketKeeper,
          battingOrder: sel.battingOrder,
        },
        create: {
          matchId,
          teamId: sel.teamId,
          playerId: sel.playerId,
          isPlayingXI: sel.isPlayingXI,
          isCaptain: sel.isCaptain || false,
          isViceCaptain: sel.isViceCaptain || false,
          isWicketKeeper: sel.isWicketKeeper || false,
          battingOrder: sel.battingOrder,
        },
      });
    }

    return this.getMatchSquads(matchId);
  }

  static async getMatchSquads(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        matchPlayers: {
          include: { player: true },
          orderBy: { battingOrder: 'asc' },
        },
      },
    });

    if (!match) throw AppError.notFound('Match not found');

    const homeSquad = match.matchPlayers.filter((p) => p.teamId === match.homeTeamId);
    const awaySquad = match.matchPlayers.filter((p) => p.teamId === match.awayTeamId);

    return {
      matchId: match.id,
      homeTeam: {
        team: match.homeTeam,
        playingXI: homeSquad.filter((p) => p.isPlayingXI),
        bench: homeSquad.filter((p) => !p.isPlayingXI),
      },
      awayTeam: {
        team: match.awayTeam,
        playingXI: awaySquad.filter((p) => p.isPlayingXI),
        bench: awaySquad.filter((p) => !p.isPlayingXI),
      },
    };
  }
}
