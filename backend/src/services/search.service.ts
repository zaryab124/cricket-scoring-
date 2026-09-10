import { prisma } from './prisma.js';

export class SearchService {
  /**
   * Global multi-entity search across players, teams, tournaments, and fixtures
   */
  static async globalSearch(params: {
    q?: string;
    type?: string;
    format?: string;
    status?: string;
    limit?: number;
  }) {
    const query = (params.q || '').trim();
    const type = params.type || 'all';
    const limit = Math.min(50, Math.max(1, params.limit || 10));

    if (!query && type === 'all') {
      return {
        query: '',
        players: [],
        teams: [],
        tournaments: [],
        matches: [],
      };
    }

    const searchPromises: Record<string, Promise<any[]>> = {};

    // 1. Search Players
    if (type === 'all' || type === 'players') {
      const playerWhere: any = {};
      if (query) {
        playerWhere.OR = [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { nationality: { contains: query } },
          { playerRole: { contains: query } },
        ];
      }
      searchPromises.players = prisma.player.findMany({
        where: playerWhere,
        take: limit,
        orderBy: { firstName: 'asc' },
        include: {
          teamMemberships: {
            where: { isActive: true },
            include: { team: { select: { id: true, name: true, shortName: true, code: true } } },
          },
        },
      });
    }

    // 2. Search Teams
    if (type === 'all' || type === 'teams') {
      const teamWhere: any = {};
      if (query) {
        teamWhere.OR = [
          { name: { contains: query } },
          { shortName: { contains: query } },
          { code: { contains: query } },
          { city: { contains: query } },
        ];
      }
      searchPromises.teams = prisma.team.findMany({
        where: teamWhere,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { members: true } },
        },
      });
    }

    // 3. Search Tournaments / Competitions
    if (type === 'all' || type === 'tournaments') {
      const compWhere: any = {};
      if (query) {
        compWhere.OR = [
          { name: { contains: query } },
          { code: { contains: query } },
        ];
      }
      if (params.format) compWhere.format = params.format;
      if (params.status) compWhere.status = params.status;

      searchPromises.tournaments = prisma.competition.findMany({
        where: compWhere,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { matches: true, teams: true } },
        },
      });
    }

    // 4. Search Matches
    if (type === 'all' || type === 'matches') {
      const matchWhere: any = {};
      if (query) {
        matchWhere.OR = [
          { title: { contains: query } },
          { venue: { contains: query } },
          { city: { contains: query } },
          { homeTeam: { name: { contains: query } } },
          { awayTeam: { name: { contains: query } } },
        ];
      }
      if (params.format) matchWhere.format = params.format;
      if (params.status) matchWhere.status = params.status;

      searchPromises.matches = prisma.match.findMany({
        where: matchWhere,
        take: limit,
        orderBy: { matchDate: 'desc' },
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          winner: { select: { id: true, name: true, shortName: true } },
          competition: { select: { id: true, name: true, code: true } },
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
      });
    }

    const [players, teams, tournaments, matches] = await Promise.all([
      searchPromises.players || Promise.resolve([]),
      searchPromises.teams || Promise.resolve([]),
      searchPromises.tournaments || Promise.resolve([]),
      searchPromises.matches || Promise.resolve([]),
    ]);

    return {
      query,
      type,
      totalResults: players.length + teams.length + tournaments.length + matches.length,
      players,
      teams,
      tournaments,
      matches,
    };
  }
}
