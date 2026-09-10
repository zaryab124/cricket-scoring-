import { prisma } from './prisma.js';

export interface RankingItem {
  rank: number;
  playerId: string;
  firstName: string;
  lastName: string;
  teamName?: string;
  teamCode?: string;
  playerRole: string;
  rating: number;
  points: number;
  metrics: Record<string, any>;
}

export class RankingService {
  /**
   * Deterministically calculates player rankings
   */
  static async calculateRankings(options: {
    category?: 'BATTING' | 'BOWLING' | 'ALL_ROUNDER';
    format?: string;
    competitionId?: string;
    limit?: number;
  } = {}) {
    const category = options.category || 'BATTING';
    const limit = Math.min(100, Math.max(1, options.limit || 20));

    // Fetch players with their team memberships
    const players = await prisma.player.findMany({
      where: { status: 'ACTIVE' },
      include: {
        teamMemberships: {
          where: { isActive: true },
          include: { team: true },
        },
      },
    });

    // Fetch ball events filtered by format and/or competition
    const matchFilter: any = {
      status: { in: ['COMPLETED', 'LIVE', 'INNINGS_BREAK', 'SUPER_OVER'] },
    };
    if (options.format && options.format !== 'ALL') {
      matchFilter.format = options.format;
    }
    if (options.competitionId) {
      matchFilter.competitionId = options.competitionId;
    }

    const [battingBalls, bowlingBalls, fieldingEvents] = await Promise.all([
      prisma.ballEvent.findMany({
        where: {
          innings: { match: matchFilter },
        },
        select: {
          id: true,
          inningsId: true,
          batsmanId: true,
          runsScored: true,
          extraRuns: true,
          extraType: true,
          isBoundaryFour: true,
          isBoundarySix: true,
          isWicket: true,
          dismissedPlayerId: true,
          wicketType: true,
        },
      }),
      prisma.ballEvent.findMany({
        where: {
          innings: { match: matchFilter },
        },
        select: {
          id: true,
          inningsId: true,
          bowlerId: true,
          runsScored: true,
          extraRuns: true,
          extraType: true,
          isLegalBall: true,
          isWicket: true,
          wicketType: true,
        },
      }),
      prisma.ballEvent.findMany({
        where: {
          isWicket: true,
          fielderId: { not: null },
          innings: { match: matchFilter },
        },
        select: {
          fielderId: true,
          wicketType: true,
        },
      }),
    ]);

    // Aggregate Batting Metrics per player
    const batStats = new Map<string, {
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      dismissals: number;
      inningsMap: Map<string, number>;
    }>();

    battingBalls.forEach((b) => {
      if (!batStats.has(b.batsmanId)) {
        batStats.set(b.batsmanId, {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dismissals: 0,
          inningsMap: new Map(),
        });
      }
      const st = batStats.get(b.batsmanId)!;
      st.runs += b.runsScored;
      if (b.extraType !== 'WIDE') st.balls += 1;
      if (b.isBoundaryFour) st.fours += 1;
      if (b.isBoundarySix) st.sixes += 1;

      const innRuns = (st.inningsMap.get(b.inningsId) || 0) + b.runsScored;
      st.inningsMap.set(b.inningsId, innRuns);
    });

    battingBalls.forEach((b) => {
      if (b.isWicket && b.dismissedPlayerId && b.wicketType !== 'RETIRED_HURT') {
        const st = batStats.get(b.dismissedPlayerId);
        if (st) {
          st.dismissals += 1;
        }
      }
    });

    // Aggregate Bowling Metrics per player
    const bowlStats = new Map<string, {
      legalBalls: number;
      runsConceded: number;
      wickets: number;
      inningsMap: Map<string, { runs: number; wickets: number }>;
    }>();

    bowlingBalls.forEach((b) => {
      if (!bowlStats.has(b.bowlerId)) {
        bowlStats.set(b.bowlerId, {
          legalBalls: 0,
          runsConceded: 0,
          wickets: 0,
          inningsMap: new Map(),
        });
      }
      const st = bowlStats.get(b.bowlerId)!;
      if (b.isLegalBall) st.legalBalls += 1;

      let runsCharged = b.runsScored;
      if (b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE' && b.extraType !== 'PENALTY') {
        runsCharged += b.extraRuns;
      }
      st.runsConceded += runsCharged;

      if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT' && b.wicketType !== 'RETIRED_OUT') {
        st.wickets += 1;
      }

      if (!st.inningsMap.has(b.inningsId)) {
        st.inningsMap.set(b.inningsId, { runs: 0, wickets: 0 });
      }
      const innFig = st.inningsMap.get(b.inningsId)!;
      innFig.runs += runsCharged;
      if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT' && b.wicketType !== 'RETIRED_OUT') {
        innFig.wickets += 1;
      }
    });

    // Aggregate Fielding
    const fieldStats = new Map<string, number>();
    fieldingEvents.forEach((f) => {
      if (f.fielderId) {
        fieldStats.set(f.fielderId, (fieldStats.get(f.fielderId) || 0) + 1);
      }
    });

    // Compute rankings per player
    const rankedList: RankingItem[] = [];

    for (const player of players) {
      const bData = batStats.get(player.id) || { runs: 0, balls: 0, fours: 0, sixes: 0, dismissals: 0, inningsMap: new Map() };
      const wData = bowlStats.get(player.id) || { legalBalls: 0, runsConceded: 0, wickets: 0, inningsMap: new Map() };
      const catches = fieldStats.get(player.id) || 0;

      const battingInnings = bData.inningsMap.size;
      const battingAvg = bData.dismissals > 0 ? bData.runs / bData.dismissals : bData.runs;
      const strikeRate = bData.balls > 0 ? (bData.runs / bData.balls) * 100 : 0;
      const notOuts = Math.max(0, battingInnings - bData.dismissals);

      let fifties = 0;
      let hundreds = 0;
      let highScore = 0;
      bData.inningsMap.forEach((runs) => {
        if (runs > highScore) highScore = runs;
        if (runs >= 100) hundreds += 1;
        else if (runs >= 50) fifties += 1;
      });

      const bowlingInnings = wData.inningsMap.size;
      const oversNumeric = wData.legalBalls / 6;
      const economy = oversNumeric > 0 ? wData.runsConceded / oversNumeric : 0;
      const bowlingAvg = wData.wickets > 0 ? wData.runsConceded / wData.wickets : 0;

      let threeWickets = 0;
      let fiveWickets = 0;
      wData.inningsMap.forEach((fig) => {
        if (fig.wickets >= 5) fiveWickets += 1;
        else if (fig.wickets >= 3) threeWickets += 1;
      });

      // Deterministic formulas:
      // Batting points
      const battingPoints =
        bData.runs * 1.0 +
        battingAvg * 1.5 +
        strikeRate * 0.5 +
        fifties * 25 +
        hundreds * 50 +
        notOuts * 10;

      // Bowling points
      const bowlingPoints =
        wData.wickets * 30 +
        (oversNumeric >= 1 ? Math.max(0, (10 - economy) * 12) : 0) +
        threeWickets * 20 +
        fiveWickets * 45 +
        (wData.wickets > 0 ? Math.max(0, (40 - bowlingAvg) * 0.8) : 0);

      // All-Rounder points
      const allRounderPoints =
        Math.min(battingPoints, bowlingPoints * 1.2) * 1.1 +
        (battingPoints + bowlingPoints) * 0.2 +
        catches * 15;

      let points = 0;
      let metrics: Record<string, any> = {};

      if (category === 'BATTING') {
        points = battingPoints;
        metrics = {
          innings: battingInnings,
          runs: bData.runs,
          balls: bData.balls,
          average: Number(battingAvg.toFixed(2)),
          strikeRate: Number(strikeRate.toFixed(2)),
          highScore,
          fifties,
          hundreds,
          fours: bData.fours,
          sixes: bData.sixes,
          notOuts,
        };
      } else if (category === 'BOWLING') {
        points = bowlingPoints;
        metrics = {
          innings: bowlingInnings,
          overs: `${Math.floor(wData.legalBalls / 6)}.${wData.legalBalls % 6}`,
          runsConceded: wData.runsConceded,
          wickets: wData.wickets,
          economy: Number(economy.toFixed(2)),
          average: Number(bowlingAvg.toFixed(2)),
          threeWicketHauls: threeWickets,
          fiveWicketHauls: fiveWickets,
        };
      } else if (category === 'ALL_ROUNDER') {
        points = allRounderPoints;
        metrics = {
          battingRuns: bData.runs,
          battingAvg: Number(battingAvg.toFixed(2)),
          wickets: wData.wickets,
          economy: Number(economy.toFixed(2)),
          catches,
        };
      }

      const primaryTeam = player.teamMemberships[0]?.team;

      rankedList.push({
        rank: 1,
        playerId: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        teamName: primaryTeam?.name,
        teamCode: primaryTeam?.code,
        playerRole: player.playerRole,
        points: Math.round(points * 10) / 10,
        rating: Math.round(Math.min(1000, points)),
        metrics,
      });
    }

    // Sort descending by points, tie-break by name
    rankedList.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

    // Assign 1-indexed ranks
    rankedList.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return {
      category,
      format: options.format || 'ALL',
      competitionId: options.competitionId || null,
      rankings: rankedList.slice(0, limit),
    };
  }
}
