import { prisma } from './prisma.js';
import { AppError } from '../utils/appError.js';
import { CompetitionType, MatchFormat, PaginationParams } from '../types/index.js';

export interface CreateCompetitionDto {
  name: string;
  code: string;
  type: CompetitionType;
  format: MatchFormat;
  seasonYear?: number;
  startDate?: Date;
  endDate?: Date;
  bannerUrl?: string;
  logoUrl?: string;
  organizerId?: string;
  rulesJson?: string;
}

export interface UpdateCompetitionDto {
  name?: string;
  code?: string;
  type?: CompetitionType;
  format?: MatchFormat;
  seasonYear?: number;
  startDate?: Date;
  endDate?: Date;
  bannerUrl?: string;
  logoUrl?: string;
  status?: string;
  rulesJson?: string;
}

export class CompetitionService {
  static async listCompetitions(params: PaginationParams & { type?: CompetitionType; status?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { code: { contains: params.search } },
      ];
    }

    const [total, competitions] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { matches: true, seasons: true, teams: true },
          },
        },
      }),
    ]);

    return { competitions, total, page, limit };
  }

  static async getCompetitionById(id: string) {
    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        seasons: true,
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                shortName: true,
                code: true,
                logoUrl: true,
                city: true,
              },
            },
          },
        },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            winner: true,
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
          orderBy: { matchDate: 'asc' },
        },
      },
    });

    if (!competition) {
      throw AppError.notFound('Competition not found');
    }

    return competition;
  }

  static async createCompetition(dto: CreateCompetitionDto) {
    const existing = await prisma.competition.findUnique({ where: { code: dto.code.toUpperCase() } });
    if (existing) {
      throw AppError.conflict(`Competition with code ${dto.code} already exists`);
    }

    const competition = await prisma.competition.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        type: dto.type || 'TOURNAMENT',
        format: dto.format || 'T20',
        seasonYear: dto.seasonYear || new Date().getFullYear(),
        startDate: dto.startDate,
        endDate: dto.endDate,
        bannerUrl: dto.bannerUrl,
        logoUrl: dto.logoUrl,
        organizerId: dto.organizerId,
        rulesJson: dto.rulesJson,
        status: 'UPCOMING',
      },
    });

    // Create default season
    await prisma.season.create({
      data: {
        competitionId: competition.id,
        name: `${competition.name} - Season ${competition.seasonYear}`,
        year: competition.seasonYear,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: 'ACTIVE',
      },
    });

    return competition;
  }

  static async updateCompetition(id: string, dto: UpdateCompetitionDto) {
    const competition = await prisma.competition.findUnique({ where: { id } });
    if (!competition) throw AppError.notFound('Competition not found');

    if (dto.code && dto.code.toUpperCase() !== competition.code) {
      const existing = await prisma.competition.findUnique({ where: { code: dto.code.toUpperCase() } });
      if (existing) throw AppError.conflict(`Competition with code ${dto.code} already exists`);
    }

    return prisma.competition.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : undefined,
      },
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  static async updateCompetitionStatus(id: string, status: string) {
    const validStatuses = ['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      throw AppError.badRequest(`Invalid competition status: ${status}`);
    }

    const competition = await prisma.competition.findUnique({ where: { id } });
    if (!competition) throw AppError.notFound('Competition not found');

    return prisma.competition.update({
      where: { id },
      data: { status },
    });
  }

  static async addTeamToCompetition(
    competitionId: string,
    teamId: string,
    groupName?: string,
    seed?: number,
    status = 'REGISTERED'
  ) {
    const [competition, team] = await Promise.all([
      prisma.competition.findUnique({ where: { id: competitionId } }),
      prisma.team.findUnique({ where: { id: teamId } }),
    ]);

    if (!competition) throw AppError.notFound('Competition not found');
    if (!team) throw AppError.notFound('Team not found');

    return prisma.competitionTeam.upsert({
      where: {
        competitionId_teamId: { competitionId, teamId },
      },
      update: {
        groupName: groupName ?? undefined,
        seed: seed ?? undefined,
        status,
      },
      create: {
        competitionId,
        teamId,
        groupName,
        seed,
        status,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            code: true,
            logoUrl: true,
            city: true,
          },
        },
      },
    });
  }

  static async removeTeamFromCompetition(competitionId: string, teamId: string) {
    const record = await prisma.competitionTeam.findUnique({
      where: {
        competitionId_teamId: { competitionId, teamId },
      },
    });

    if (!record) throw AppError.notFound('Team is not registered in this competition');

    return prisma.competitionTeam.delete({
      where: {
        competitionId_teamId: { competitionId, teamId },
      },
    });
  }

  static async getCompetitionTeams(competitionId: string) {
    const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) throw AppError.notFound('Competition not found');

    const teams = await prisma.competitionTeam.findMany({
      where: { competitionId },
      include: {
        team: {
          include: {
            manager: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: [{ groupName: 'asc' }, { seed: 'asc' }, { joinedAt: 'asc' }],
    });

    return teams;
  }

  static async getTournamentStandings(competitionId: string) {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        teams: {
          include: { team: true },
        },
        matches: {
          where: {
            status: { in: ['COMPLETED', 'ABANDONED', 'NO_RESULT'] },
          },
          include: {
            homeTeam: true,
            awayTeam: true,
            innings: {
              include: {
                battingTeam: true,
                bowlingTeam: true,
              },
            },
          },
        },
      },
    });

    if (!competition) throw AppError.notFound('Competition not found');

    // Collect all teams: registered teams + teams participating in competition matches
    const teamMap = new Map<string, { id: string; name: string; shortName: string; code: string; logoUrl?: string | null; groupName?: string | null }>();

    for (const ct of competition.teams) {
      teamMap.set(ct.teamId, {
        id: ct.team.id,
        name: ct.team.name,
        shortName: ct.team.shortName,
        code: ct.team.code,
        logoUrl: ct.team.logoUrl,
        groupName: ct.groupName,
      });
    }

    for (const m of competition.matches) {
      if (!teamMap.has(m.homeTeamId)) {
        teamMap.set(m.homeTeamId, {
          id: m.homeTeam.id,
          name: m.homeTeam.name,
          shortName: m.homeTeam.shortName,
          code: m.homeTeam.code,
          logoUrl: m.homeTeam.logoUrl,
        });
      }
      if (!teamMap.has(m.awayTeamId)) {
        teamMap.set(m.awayTeamId, {
          id: m.awayTeam.id,
          name: m.awayTeam.name,
          shortName: m.awayTeam.shortName,
          code: m.awayTeam.code,
          logoUrl: m.awayTeam.logoUrl,
        });
      }
    }

    // Initialize standings table per team
    const standings = new Map<string, {
      teamId: string;
      teamName: string;
      teamShortName: string;
      teamCode: string;
      logoUrl?: string | null;
      groupName?: string | null;
      played: number;
      won: number;
      lost: number;
      tied: number;
      noResult: number;
      points: number;
      totalRunsScored: number;
      totalLegalBallsFaced: number;
      totalRunsConceded: number;
      totalLegalBallsBowled: number;
      netRunRate: number;
    }>();

    for (const [tId, tData] of teamMap.entries()) {
      standings.set(tId, {
        teamId: tId,
        teamName: tData.name,
        teamShortName: tData.shortName,
        teamCode: tData.code,
        logoUrl: tData.logoUrl,
        groupName: tData.groupName,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        noResult: 0,
        points: 0,
        totalRunsScored: 0,
        totalLegalBallsFaced: 0,
        totalRunsConceded: 0,
        totalLegalBallsBowled: 0,
        netRunRate: 0,
      });
    }

    // Process completed matches
    for (const match of competition.matches) {
      const homeStats = standings.get(match.homeTeamId);
      const awayStats = standings.get(match.awayTeamId);

      if (match.status === 'ABANDONED' || match.status === 'NO_RESULT') {
        if (homeStats) {
          homeStats.played += 1;
          homeStats.noResult += 1;
          homeStats.points += 1;
        }
        if (awayStats) {
          awayStats.played += 1;
          awayStats.noResult += 1;
          awayStats.points += 1;
        }
        continue;
      }

      if (match.status === 'COMPLETED') {
        if (homeStats) homeStats.played += 1;
        if (awayStats) awayStats.played += 1;

        if (match.winType === 'TIED') {
          if (homeStats) {
            homeStats.tied += 1;
            homeStats.points += 1;
          }
          if (awayStats) {
            awayStats.tied += 1;
            awayStats.points += 1;
          }
        } else if (match.winnerId) {
          if (match.winnerId === match.homeTeamId) {
            if (homeStats) {
              homeStats.won += 1;
              homeStats.points += 2;
            }
            if (awayStats) {
              awayStats.lost += 1;
            }
          } else if (match.winnerId === match.awayTeamId) {
            if (awayStats) {
              awayStats.won += 1;
              awayStats.points += 2;
            }
            if (homeStats) {
              homeStats.lost += 1;
            }
          }
        }

        // NRR calculations
        const maxBallsPerInnings = (match.oversLimit || 20) * 6;

        for (const inn of match.innings) {
          const batTeamStats = standings.get(inn.battingTeamId);
          const bowlTeamStats = standings.get(inn.bowlingTeamId);

          // If team is all out in a limited overs match, rules count the full quota of overs
          let effectiveBallsFaced = inn.legalBalls;
          if (inn.wickets >= 10 && maxBallsPerInnings > 0) {
            effectiveBallsFaced = maxBallsPerInnings;
          }

          if (batTeamStats) {
            batTeamStats.totalRunsScored += inn.totalRuns;
            batTeamStats.totalLegalBallsFaced += effectiveBallsFaced;
          }

          if (bowlTeamStats) {
            bowlTeamStats.totalRunsConceded += inn.totalRuns;
            bowlTeamStats.totalLegalBallsBowled += effectiveBallsFaced;
          }
        }
      }
    }

    // Calculate final NRR for each team
    const standingsList = Array.from(standings.values()).map((s) => {
      const oversFacedDecimal = Math.floor(s.totalLegalBallsFaced / 6) + (s.totalLegalBallsFaced % 6) / 6;
      const oversBowledDecimal = Math.floor(s.totalLegalBallsBowled / 6) + (s.totalLegalBallsBowled % 6) / 6;

      const runRateFor = oversFacedDecimal > 0 ? s.totalRunsScored / oversFacedDecimal : 0;
      const runRateAgainst = oversBowledDecimal > 0 ? s.totalRunsConceded / oversBowledDecimal : 0;

      const netRunRate = Math.round((runRateFor - runRateAgainst) * 1000) / 1000;

      return {
        teamId: s.teamId,
        teamName: s.teamName,
        teamShortName: s.teamShortName,
        teamCode: s.teamCode,
        logoUrl: s.logoUrl,
        groupName: s.groupName,
        played: s.played,
        won: s.won,
        lost: s.lost,
        tied: s.tied,
        noResult: s.noResult,
        points: s.points,
        netRunRate,
        runsScored: s.totalRunsScored,
        oversFaced: `${Math.floor(s.totalLegalBallsFaced / 6)}.${s.totalLegalBallsFaced % 6}`,
        runsConceded: s.totalRunsConceded,
        oversBowled: `${Math.floor(s.totalLegalBallsBowled / 6)}.${s.totalLegalBallsBowled % 6}`,
      };
    });

    // Sort by Points DESC, NRR DESC, Won DESC, Name ASC
    standingsList.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.netRunRate !== a.netRunRate) return b.netRunRate - a.netRunRate;
      if (b.won !== a.won) return b.won - a.won;
      return a.teamName.localeCompare(b.teamName);
    });

    return {
      competition: {
        id: competition.id,
        name: competition.name,
        code: competition.code,
        type: competition.type,
        format: competition.format,
        seasonYear: competition.seasonYear,
        status: competition.status,
      },
      standings: standingsList,
    };
  }
}
