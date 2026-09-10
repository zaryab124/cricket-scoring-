import { prisma } from './prisma.js';
import { AppError } from '../utils/appError.js';
import { BattingStyle, BowlingStyle, PlayerRole, PaginationParams } from '../types/index.js';

export interface CreatePlayerDto {
  userId?: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle;
  playerRole?: PlayerRole;
  isWicketKeeper?: boolean;
  status?: string;
  nationality?: string;
  bio?: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
}

export class PlayerService {
  static async listPlayers(params: PaginationParams & { role?: PlayerRole; teamId?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.role) where.playerRole = params.role;
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { nationality: { contains: params.search } },
      ];
    }
    if (params.teamId) {
      where.teamMemberships = {
        some: { teamId: params.teamId, isActive: true },
      };
    }

    const [total, players] = await Promise.all([
      prisma.player.count({ where }),
      prisma.player.findMany({
        where,
        skip,
        take: limit,
        orderBy: { firstName: 'asc' },
        include: {
          teamMemberships: {
            where: { isActive: true },
            include: {
              team: {
                select: { id: true, name: true, shortName: true, code: true, logoUrl: true },
              },
            },
          },
        },
      }),
    ]);

    return { players, total, page, limit };
  }

  static async getPlayerById(id: string) {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, avatarUrl: true, role: true },
        },
        teamMemberships: {
          orderBy: { joinedAt: 'desc' },
          include: {
            team: true,
          },
        },
      },
    });

    if (!player) {
      throw AppError.notFound('Player profile not found');
    }

    // Compute Career Statistics dynamically from BallEvents
    const careerStats = await this.computeCareerStats(id);

    // Get Recent Matches player appeared in
    const recentMatches = await prisma.match.findMany({
      where: {
        OR: [
          { matchPlayers: { some: { playerId: id } } },
          { innings: { some: { ballEvents: { some: { OR: [{ batsmanId: id }, { bowlerId: id }] } } } } },
        ],
      },
      take: 5,
      orderBy: { matchDate: 'desc' },
      include: {
        homeTeam: true,
        awayTeam: true,
        winner: true,
      },
    });

    return {
      ...player,
      careerStats,
      recentMatches,
    };
  }

  static async computeCareerStats(playerId: string) {
    // 1. Batting career stats
    const ballsFaced = await prisma.ballEvent.findMany({
      where: { batsmanId: playerId },
      include: { innings: true },
    });

    const dismissals = await prisma.ballEvent.count({
      where: {
        isWicket: true,
        dismissedPlayerId: playerId,
        wicketType: { not: 'RETIRED_HURT' },
      },
    });

    let totalRuns = 0;
    let ballsCount = 0;
    let fours = 0;
    let sixes = 0;

    // Group innings for high score and 50s/100s
    const runsPerInnings = new Map<string, number>();

    ballsFaced.forEach((b) => {
      totalRuns += b.runsScored;
      if (b.extraType !== 'WIDE') ballsCount += 1;
      if (b.isBoundaryFour) fours += 1;
      if (b.isBoundarySix) sixes += 1;

      const current = runsPerInnings.get(b.inningsId) || 0;
      runsPerInnings.set(b.inningsId, current + b.runsScored);
    });

    let highScore = 0;
    let fifties = 0;
    let hundreds = 0;

    runsPerInnings.forEach((runs) => {
      if (runs > highScore) highScore = runs;
      if (runs >= 100) hundreds += 1;
      else if (runs >= 50) fifties += 1;
    });

    const battingInningsCount = runsPerInnings.size;
    const battingAverage = dismissals > 0 ? Number((totalRuns / dismissals).toFixed(2)) : totalRuns;
    const strikeRate = ballsCount > 0 ? Number(((totalRuns / ballsCount) * 100).toFixed(2)) : 0.0;

    // 2. Bowling career stats
    const ballsBowled = await prisma.ballEvent.findMany({
      where: { bowlerId: playerId },
      include: { innings: true },
    });

    let bowlingLegalBalls = 0;
    let bowlingRunsConceded = 0;
    let wicketsCount = 0;

    const bowlingFiguresPerInnings = new Map<string, { runs: number; wickets: number }>();

    ballsBowled.forEach((b) => {
      if (b.isLegalBall) bowlingLegalBalls += 1;

      // Runs charged to bowler
      if (b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE' && b.extraType !== 'PENALTY') {
        bowlingRunsConceded += (b.runsScored + b.extraRuns);
      } else {
        bowlingRunsConceded += b.runsScored;
      }

      if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT' && b.wicketType !== 'RETIRED_OUT') {
        wicketsCount += 1;
      }

      if (!bowlingFiguresPerInnings.has(b.inningsId)) {
        bowlingFiguresPerInnings.set(b.inningsId, { runs: 0, wickets: 0 });
      }
      const fig = bowlingFiguresPerInnings.get(b.inningsId)!;
      if (b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE' && b.extraType !== 'PENALTY') {
        fig.runs += (b.runsScored + b.extraRuns);
      }
      if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT' && b.wicketType !== 'RETIRED_OUT') {
        fig.wickets += 1;
      }
    });

    let bestWickets = 0;
    let bestRuns = 999;
    let threeWicketHauls = 0;
    let fiveWicketHauls = 0;

    bowlingFiguresPerInnings.forEach((fig) => {
      if (fig.wickets >= 5) fiveWicketHauls += 1;
      else if (fig.wickets >= 3) threeWicketHauls += 1;
      if (fig.wickets > bestWickets || (fig.wickets === bestWickets && fig.runs < bestRuns)) {
        bestWickets = fig.wickets;
        bestRuns = fig.runs;
      }
    });

    const totalOversNumeric = bowlingLegalBalls / 6;
    const bowlingEconomy = totalOversNumeric > 0 ? Number((bowlingRunsConceded / totalOversNumeric).toFixed(2)) : 0.0;
    const bowlingAverage = wicketsCount > 0 ? Number((bowlingRunsConceded / wicketsCount).toFixed(2)) : 0.0;
    const bestBowling = bestWickets > 0 ? `${bestWickets}/${bestRuns}` : '—';

    // 3. Fielding stats
    const catches = await prisma.ballEvent.count({
      where: { fielderId: playerId, isWicket: true, wicketType: 'CAUGHT' },
    });
    const runOuts = await prisma.ballEvent.count({
      where: { fielderId: playerId, isWicket: true, wicketType: 'RUN_OUT' },
    });
    const stumpings = await prisma.ballEvent.count({
      where: { fielderId: playerId, isWicket: true, wicketType: 'STUMPED' },
    });

    return {
      batting: {
        innings: battingInningsCount,
        runs: totalRuns,
        balls: ballsCount,
        average: battingAverage,
        strikeRate,
        highScore,
        fifties,
        hundreds,
        fours,
        sixes,
        notOuts: Math.max(0, battingInningsCount - dismissals),
      },
      bowling: {
        innings: bowlingFiguresPerInnings.size,
        overs: `${Math.floor(bowlingLegalBalls / 6)}.${bowlingLegalBalls % 6}`,
        runs: bowlingRunsConceded,
        wickets: wicketsCount,
        economy: bowlingEconomy,
        average: bowlingAverage,
        bestBowling,
        threeWicketHauls,
        fiveWicketHauls,
      },
      fielding: {
        catches,
        runOuts,
        stumpings,
      },
    };
  }

  static async createPlayer(dto: CreatePlayerDto) {
    if (dto.userId) {
      const existing = await prisma.player.findUnique({ where: { userId: dto.userId } });
      if (existing) {
        throw AppError.conflict('A player profile is already linked to this user account');
      }
    }

    return prisma.player.create({
      data: {
        userId: dto.userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        jerseyNumber: dto.jerseyNumber,
        battingStyle: dto.battingStyle || 'RIGHT_HAND',
        bowlingStyle: dto.bowlingStyle || 'NONE',
        playerRole: dto.playerRole || 'ALL_ROUNDER',
        isWicketKeeper: dto.isWicketKeeper || false,
        status: dto.status || 'ACTIVE',
        nationality: dto.nationality,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        dateOfBirth: dto.dateOfBirth,
      },
    });
  }

  static async updatePlayer(id: string, dto: Partial<CreatePlayerDto>) {
    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      throw AppError.notFound('Player not found');
    }

    return prisma.player.update({
      where: { id },
      data: dto,
    });
  }
}
