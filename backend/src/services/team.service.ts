import { prisma } from './prisma.js';
import { AppError } from '../utils/appError.js';
import { PaginationParams } from '../types/index.js';

export interface CreateTeamDto {
  name: string;
  shortName: string;
  code: string;
  logoUrl?: string;
  bannerUrl?: string;
  homeGround?: string;
  city?: string;
  country?: string;
  managerId?: string;
}

export class TeamService {
  static async listTeams(params: PaginationParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { shortName: { contains: params.search } },
        { code: { contains: params.search } },
        { city: { contains: params.search } },
      ];
    }

    const [total, teams] = await Promise.all([
      prisma.team.count({ where }),
      prisma.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          manager: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { members: true },
          },
        },
      }),
    ]);

    return { teams, total, page, limit };
  }

  static async getTeamById(id: string) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        members: {
          where: { isActive: true },
          include: {
            player: true,
          },
        },
      },
    });

    if (!team) {
      throw AppError.notFound('Team not found');
    }

    return team;
  }

  static async createTeam(dto: CreateTeamDto) {
    const existing = await prisma.team.findUnique({ where: { code: dto.code.toUpperCase() } });
    if (existing) {
      throw AppError.conflict(`Team with code ${dto.code} already exists`);
    }

    return prisma.team.create({
      data: {
        name: dto.name,
        shortName: dto.shortName,
        code: dto.code.toUpperCase(),
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        homeGround: dto.homeGround,
        city: dto.city,
        country: dto.country,
        managerId: dto.managerId,
      },
    });
  }

  static async updateTeam(id: string, dto: Partial<CreateTeamDto>) {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) throw AppError.notFound('Team not found');

    if (dto.code && dto.code.toUpperCase() !== team.code) {
      const existing = await prisma.team.findUnique({ where: { code: dto.code.toUpperCase() } });
      if (existing) throw AppError.conflict(`Team with code ${dto.code} already exists`);
    }

    return prisma.team.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : undefined,
      },
    });
  }

  static async addMember(teamId: string, playerId: string, role = 'PLAYER', jerseyNumber?: number, isCaptain = false, isViceCaptain = false, isWicketKeeper = false) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw AppError.notFound('Team not found');

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw AppError.notFound('Player not found');

    // If making captain or vice captain, unmark existing
    if (isCaptain || role === 'CAPTAIN') {
      await prisma.teamMember.updateMany({
        where: { teamId, isCaptain: true },
        data: { isCaptain: false },
      });
      await prisma.team.update({ where: { id: teamId }, data: { captainId: playerId } });
    }

    if (isViceCaptain || role === 'VICE_CAPTAIN') {
      await prisma.teamMember.updateMany({
        where: { teamId, isViceCaptain: true },
        data: { isViceCaptain: false },
      });
      await prisma.team.update({ where: { id: teamId }, data: { viceCaptainId: playerId } });
    }

    return prisma.teamMember.upsert({
      where: {
        teamId_playerId: { teamId, playerId },
      },
      update: {
        role,
        jerseyNumber: jerseyNumber ?? undefined,
        isCaptain: isCaptain || role === 'CAPTAIN',
        isViceCaptain: isViceCaptain || role === 'VICE_CAPTAIN',
        isWicketKeeper: isWicketKeeper || role === 'WICKET_KEEPER',
        isActive: true,
        leftAt: null,
      },
      create: {
        teamId,
        playerId,
        role,
        jerseyNumber,
        isCaptain: isCaptain || role === 'CAPTAIN',
        isViceCaptain: isViceCaptain || role === 'VICE_CAPTAIN',
        isWicketKeeper: isWicketKeeper || role === 'WICKET_KEEPER',
        isActive: true,
      },
    });
  }

  static async updateMemberRoles(
    teamId: string,
    playerId: string,
    data: {
      role?: string;
      jerseyNumber?: number;
      isCaptain?: boolean;
      isViceCaptain?: boolean;
      isWicketKeeper?: boolean;
      isActive?: boolean;
    }
  ) {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_playerId: { teamId, playerId } },
    });
    if (!member) throw AppError.notFound('Team membership record not found');

    if (data.isCaptain) {
      await prisma.teamMember.updateMany({
        where: { teamId, isCaptain: true, NOT: { playerId } },
        data: { isCaptain: false },
      });
      await prisma.team.update({ where: { id: teamId }, data: { captainId: playerId } });
    }

    if (data.isViceCaptain) {
      await prisma.teamMember.updateMany({
        where: { teamId, isViceCaptain: true, NOT: { playerId } },
        data: { isViceCaptain: false },
      });
      await prisma.team.update({ where: { id: teamId }, data: { viceCaptainId: playerId } });
    }

    return prisma.teamMember.update({
      where: { teamId_playerId: { teamId, playerId } },
      data,
      include: { player: true },
    });
  }

  static async removeMember(teamId: string, playerId: string) {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_playerId: { teamId, playerId } },
    });
    if (!member) throw AppError.notFound('Team member not found');

    return prisma.teamMember.update({
      where: {
        teamId_playerId: { teamId, playerId },
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }

  static async getSquadHistory(teamId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw AppError.notFound('Team not found');

    const history = await prisma.teamMember.findMany({
      where: { teamId },
      include: { player: true },
      orderBy: { joinedAt: 'desc' },
    });

    return {
      team: { id: team.id, name: team.name, code: team.code },
      activeMembers: history.filter((m) => m.isActive),
      pastMembers: history.filter((m) => !m.isActive),
    };
  }

  static async getTeamStats(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!team) throw AppError.notFound('Team not found');

    // Fetch all matches involving this team
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: { in: ['COMPLETED', 'ABANDONED', 'NO_RESULT'] },
      },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
        winner: { select: { id: true, name: true, shortName: true } },
        innings: {
          select: {
            id: true,
            inningsNumber: true,
            battingTeamId: true,
            bowlingTeamId: true,
            totalRuns: true,
            wickets: true,
            overs: true,
          },
        },
      },
      orderBy: { matchDate: 'desc' },
    });

    let wins = 0;
    let losses = 0;
    let ties = 0;
    let noResults = 0;
    let homePlayed = 0;
    let homeWon = 0;
    let homeLost = 0;
    let awayPlayed = 0;
    let awayWon = 0;
    let awayLost = 0;
    let totalRunsScored = 0;
    let totalWicketsTaken = 0;
    let highestScore = 0;

    const recentForm: string[] = [];

    for (const m of matches) {
      const isHome = m.homeTeamId === teamId;
      if (isHome) homePlayed += 1;
      else awayPlayed += 1;

      if (m.status === 'ABANDONED' || m.status === 'NO_RESULT') {
        noResults += 1;
        if (recentForm.length < 5) recentForm.push('NR');
        continue;
      }

      if (m.winType === 'TIED') {
        ties += 1;
        if (recentForm.length < 5) recentForm.push('T');
      } else if (m.winnerId === teamId) {
        wins += 1;
        if (isHome) homeWon += 1;
        else awayWon += 1;
        if (recentForm.length < 5) recentForm.push('W');
      } else if (m.winnerId && m.winnerId !== teamId) {
        losses += 1;
        if (isHome) homeLost += 1;
        else awayLost += 1;
        if (recentForm.length < 5) recentForm.push('L');
      }

      for (const inn of m.innings) {
        if (inn.battingTeamId === teamId) {
          totalRunsScored += inn.totalRuns;
          if (inn.totalRuns > highestScore) highestScore = inn.totalRuns;
        }
        if (inn.bowlingTeamId === teamId) {
          totalWicketsTaken += inn.wickets;
        }
      }
    }

    const matchesPlayed = matches.length;
    const completedDecided = wins + losses;
    const winPercentage = completedDecided > 0 ? Math.round((wins / completedDecided) * 1000) / 10 : 0;

    return {
      team: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        code: team.code,
        logoUrl: team.logoUrl,
        city: team.city,
        country: team.country,
        membersCount: team._count.members,
      },
      stats: {
        matchesPlayed,
        wins,
        losses,
        ties,
        noResults,
        winPercentage,
        highestScore,
        totalRunsScored,
        totalWicketsTaken,
        recentForm, // E.g. ['W', 'W', 'L', 'W']
        homeRecord: {
          played: homePlayed,
          won: homeWon,
          lost: homeLost,
        },
        awayRecord: {
          played: awayPlayed,
          won: awayWon,
          lost: awayLost,
        },
      },
    };
  }
}

