import { prisma } from './prisma.js';
import { AppError } from '../utils/appError.js';
import { ScorecardService } from './scorecard.service.js';

export class AnalyticsService {
  /**
   * Generates comprehensive analytics for a match
   */
  static async getMatchAnalytics(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        winner: true,
        innings: {
          orderBy: { inningsNumber: 'asc' },
          include: {
            battingTeam: true,
            bowlingTeam: true,
            ballEvents: {
              orderBy: [{ overNumber: 'asc' }, { ballNumber: 'asc' }],
              include: {
                batsman: true,
                nonStriker: true,
                bowler: true,
                dismissedPlayer: true,
                fielder: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      throw AppError.notFound('Match not found');
    }

    // Process each innings for over-by-over progression and detailed metrics
    const inningsAnalytics = match.innings.map((inn) => {
      const scorecard = ScorecardService.computeInningsScorecard(inn, match.oversLimit);
      const balls = inn.ballEvents || [];

      // Group balls into over progression
      const overMap = new Map<number, {
        overNumber: number;
        runsInOver: number;
        wicketsInOver: number;
        cumulativeRuns: number;
        cumulativeWickets: number;
        bowlerId: string;
        bowlerName: string;
        deliveries: Array<{
          ballNumber: number;
          runsScored: number;
          extraRuns: number;
          extraType: string | null;
          isWicket: boolean;
          isBoundaryFour: boolean;
          isBoundarySix: boolean;
          commentary: string | null;
        }>;
      }>();

      let cumulativeRuns = 0;
      let cumulativeWickets = 0;

      balls.forEach((b) => {
        const ballRuns = (b.runsScored || 0) + (b.extraRuns || 0);
        cumulativeRuns += ballRuns;
        if (b.isWicket) cumulativeWickets += 1;

        if (!overMap.has(b.overNumber)) {
          overMap.set(b.overNumber, {
            overNumber: b.overNumber,
            runsInOver: 0,
            wicketsInOver: 0,
            cumulativeRuns: 0,
            cumulativeWickets: 0,
            bowlerId: b.bowlerId,
            bowlerName: `${b.bowler.firstName} ${b.bowler.lastName}`,
            deliveries: [],
          });
        }

        const overData = overMap.get(b.overNumber)!;
        overData.runsInOver += ballRuns;
        if (b.isWicket) overData.wicketsInOver += 1;
        overData.cumulativeRuns = cumulativeRuns;
        overData.cumulativeWickets = cumulativeWickets;
        overData.deliveries.push({
          ballNumber: b.ballNumber,
          runsScored: b.runsScored,
          extraRuns: b.extraRuns,
          extraType: b.extraType,
          isWicket: b.isWicket,
          isBoundaryFour: b.isBoundaryFour,
          isBoundarySix: b.isBoundarySix,
          commentary: b.commentary,
        });
      });

      const oversProgression = Array.from(overMap.values()).sort((a, b) => a.overNumber - b.overNumber);

      // Boundary counts & dot balls
      let dotBalls = 0;
      let boundaryFours = 0;
      let boundarySixes = 0;

      balls.forEach((b) => {
        const ballRuns = (b.runsScored || 0) + (b.extraRuns || 0);
        if (ballRuns === 0) dotBalls += 1;
        if (b.isBoundaryFour) boundaryFours += 1;
        if (b.isBoundarySix) boundarySixes += 1;
      });

      return {
        inningsNumber: inn.inningsNumber,
        battingTeam: {
          id: inn.battingTeam.id,
          name: inn.battingTeam.name,
          shortName: inn.battingTeam.shortName,
          logoUrl: inn.battingTeam.logoUrl,
        },
        bowlingTeam: {
          id: inn.bowlingTeam.id,
          name: inn.bowlingTeam.name,
          shortName: inn.bowlingTeam.shortName,
          logoUrl: inn.bowlingTeam.logoUrl,
        },
        totalRuns: scorecard.totalRuns,
        wickets: scorecard.wickets,
        oversFormatted: scorecard.oversFormatted,
        runRate: scorecard.currentRunRate,
        dotBalls,
        boundaryFours,
        boundarySixes,
        extras: scorecard.extras,
        oversProgression,
        batting: scorecard.batting,
        bowling: scorecard.bowling,
        partnerships: scorecard.partnerships,
        fallOfWickets: scorecard.fallOfWickets,
      };
    });

    // Team comparisons
    const teamComparison = {
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        shortName: match.homeTeam.shortName,
        logoUrl: match.homeTeam.logoUrl,
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        shortName: match.awayTeam.shortName,
        logoUrl: match.awayTeam.logoUrl,
      },
      innings: inningsAnalytics.map((ia) => ({
        inningsNumber: ia.inningsNumber,
        teamId: ia.battingTeam.id,
        teamName: ia.battingTeam.name,
        runs: ia.totalRuns,
        wickets: ia.wickets,
        overs: ia.oversFormatted,
        runRate: ia.runRate,
        dots: ia.dotBalls,
        fours: ia.boundaryFours,
        sixes: ia.boundarySixes,
        extras: ia.extras.total,
      })),
    };

    return {
      matchId: match.id,
      title: match.title,
      format: match.format,
      oversLimit: match.oversLimit,
      venue: match.venue,
      status: match.status,
      winner: match.winner ? { id: match.winner.id, name: match.winner.name } : null,
      resultSummary: match.resultSummary,
      teamComparison,
      inningsAnalytics,
    };
  }

  /**
   * Generates player performance trends, format splits, and recent match breakdowns
   */
  static async getPlayerAnalytics(playerId: string, options: {
    format?: string;
    competitionId?: string;
    limit?: number;
  } = {}) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        teamMemberships: {
          where: { isActive: true },
          include: { team: true },
        },
      },
    });

    if (!player) {
      throw AppError.notFound('Player profile not found');
    }

    const limit = Math.min(20, Math.max(1, options.limit || 10));

    // Fetch all ball events for this player in batting and bowling
    const [battingBalls, bowlingBalls] = await Promise.all([
      prisma.ballEvent.findMany({
        where: {
          batsmanId: playerId,
          ...(options.competitionId ? { innings: { match: { competitionId: options.competitionId } } } : {}),
          ...(options.format ? { innings: { match: { format: options.format } } } : {}),
        },
        include: {
          innings: {
            include: {
              match: {
                include: { homeTeam: true, awayTeam: true },
              },
            },
          },
        },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.ballEvent.findMany({
        where: {
          bowlerId: playerId,
          ...(options.competitionId ? { innings: { match: { competitionId: options.competitionId } } } : {}),
          ...(options.format ? { innings: { match: { format: options.format } } } : {}),
        },
        include: {
          innings: {
            include: {
              match: {
                include: { homeTeam: true, awayTeam: true },
              },
            },
          },
        },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    // Group batting by match
    const battingByMatch = new Map<string, {
      matchId: string;
      matchDate: string;
      format: string;
      opponent: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      isOut: boolean;
      dismissal?: string | null;
    }>();

    battingBalls.forEach((b) => {
      const match = b.innings.match;
      const isHome = match.homeTeamId === b.innings.battingTeamId;
      const opponent = isHome ? match.awayTeam.name : match.homeTeam.name;

      if (!battingByMatch.has(match.id)) {
        battingByMatch.set(match.id, {
          matchId: match.id,
          matchDate: match.matchDate.toISOString(),
          format: match.format,
          opponent,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissal: 'not out',
        });
      }

      const matchEntry = battingByMatch.get(match.id)!;
      matchEntry.runs += b.runsScored;
      if (b.extraType !== 'WIDE') matchEntry.balls += 1;
      if (b.isBoundaryFour) matchEntry.fours += 1;
      if (b.isBoundarySix) matchEntry.sixes += 1;
      if (b.isWicket && b.dismissedPlayerId === playerId) {
        matchEntry.isOut = true;
        matchEntry.dismissal = b.wicketType;
      }
    });

    // Group bowling by match
    const bowlingByMatch = new Map<string, {
      matchId: string;
      matchDate: string;
      format: string;
      opponent: string;
      legalBalls: number;
      runsConceded: number;
      wickets: number;
      dots: number;
    }>();

    bowlingBalls.forEach((b) => {
      const match = b.innings.match;
      const isHome = match.homeTeamId === b.innings.bowlingTeamId;
      const opponent = isHome ? match.awayTeam.name : match.homeTeam.name;

      if (!bowlingByMatch.has(match.id)) {
        bowlingByMatch.set(match.id, {
          matchId: match.id,
          matchDate: match.matchDate.toISOString(),
          format: match.format,
          opponent,
          legalBalls: 0,
          runsConceded: 0,
          wickets: 0,
          dots: 0,
        });
      }

      const matchEntry = bowlingByMatch.get(match.id)!;
      if (b.isLegalBall) matchEntry.legalBalls += 1;
      if (b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE' && b.extraType !== 'PENALTY') {
        matchEntry.runsConceded += (b.runsScored + b.extraRuns);
      } else {
        matchEntry.runsConceded += b.runsScored;
      }
      if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT' && b.wicketType !== 'RETIRED_OUT') {
        matchEntry.wickets += 1;
      }
      if ((b.runsScored + b.extraRuns) === 0) {
        matchEntry.dots += 1;
      }
    });

    // Format match performances
    const recentBatting = Array.from(battingByMatch.values())
      .map((entry) => ({
        ...entry,
        strikeRate: entry.balls > 0 ? Number(((entry.runs / entry.balls) * 100).toFixed(2)) : 0.0,
      }))
      .slice(-limit)
      .reverse();

    const recentBowling = Array.from(bowlingByMatch.values())
      .map((entry) => {
        const oversNumeric = entry.legalBalls / 6;
        const economy = oversNumeric > 0 ? Number((entry.runsConceded / oversNumeric).toFixed(2)) : 0.0;
        return {
          ...entry,
          overs: `${Math.floor(entry.legalBalls / 6)}.${entry.legalBalls % 6}`,
          economy,
        };
      })
      .slice(-limit)
      .reverse();

    // Aggregate format breakdowns (T20, ODI, TEST)
    const formats = ['T20', 'ODI', 'TEST'];
    const formatBreakdown: Record<string, any> = {};

    for (const fmt of formats) {
      const fBatting = Array.from(battingByMatch.values()).filter((m) => m.format === fmt);
      const fBowling = Array.from(bowlingByMatch.values()).filter((m) => m.format === fmt);

      const totalRuns = fBatting.reduce((sum, m) => sum + m.runs, 0);
      const totalBalls = fBatting.reduce((sum, m) => sum + m.balls, 0);
      const dismissals = fBatting.filter((m) => m.isOut).length;
      const battingAverage = dismissals > 0 ? Number((totalRuns / dismissals).toFixed(2)) : totalRuns;
      const strikeRate = totalBalls > 0 ? Number(((totalRuns / totalBalls) * 100).toFixed(2)) : 0.0;

      const totalLegalBalls = fBowling.reduce((sum, m) => sum + m.legalBalls, 0);
      const totalRunsConceded = fBowling.reduce((sum, m) => sum + m.runsConceded, 0);
      const totalWickets = fBowling.reduce((sum, m) => sum + m.wickets, 0);
      const bowlingOversNum = totalLegalBalls / 6;
      const bowlingEconomy = bowlingOversNum > 0 ? Number((totalRunsConceded / bowlingOversNum).toFixed(2)) : 0.0;
      const bowlingAverage = totalWickets > 0 ? Number((totalRunsConceded / totalWickets).toFixed(2)) : 0.0;

      formatBreakdown[fmt] = {
        batting: {
          innings: fBatting.length,
          runs: totalRuns,
          balls: totalBalls,
          average: battingAverage,
          strikeRate,
          highScore: fBatting.reduce((max, m) => Math.max(max, m.runs), 0),
          fifties: fBatting.filter((m) => m.runs >= 50 && m.runs < 100).length,
          hundreds: fBatting.filter((m) => m.runs >= 100).length,
        },
        bowling: {
          innings: fBowling.length,
          overs: `${Math.floor(totalLegalBalls / 6)}.${totalLegalBalls % 6}`,
          runs: totalRunsConceded,
          wickets: totalWickets,
          economy: bowlingEconomy,
          average: bowlingAverage,
        },
      };
    }

    return {
      player: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        jerseyNumber: player.jerseyNumber,
        playerRole: player.playerRole,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyle,
        nationality: player.nationality,
        avatarUrl: player.avatarUrl,
        teams: player.teamMemberships.map((tm) => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.role,
        })),
      },
      formatBreakdown,
      recentBatting,
      recentBowling,
    };
  }

  /**
   * Generates tournament top scorers, top wicket takers, boundary leaders, and tournament records
   */
  static async getTournamentAnalytics(competitionId: string) {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        teams: { include: { team: true } },
        matches: {
          where: { status: { in: ['COMPLETED', 'LIVE', 'INNINGS_BREAK', 'SUPER_OVER'] } },
          include: {
            innings: {
              include: {
                ballEvents: {
                  include: {
                    batsman: true,
                    bowler: true,
                    dismissedPlayer: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!competition) {
      throw AppError.notFound('Competition/Tournament not found');
    }

    // Scoped metrics maps
    const batsmanMap = new Map<string, {
      playerId: string;
      firstName: string;
      lastName: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      dismissals: number;
      highScore: number;
      fifties: number;
      hundreds: number;
      inningsSet: Set<string>;
    }>();

    const bowlerMap = new Map<string, {
      playerId: string;
      firstName: string;
      lastName: string;
      legalBalls: number;
      runsConceded: number;
      wickets: number;
      bestWickets: number;
      bestRuns: number;
      inningsMap: Map<string, { runs: number; wickets: number }>;
    }>();

    // Process only matches belonging to this competition
    for (const match of competition.matches) {
      for (const inn of match.innings) {
        for (const b of inn.ballEvents) {
          // Batting calculation
          if (!batsmanMap.has(b.batsmanId)) {
            batsmanMap.set(b.batsmanId, {
              playerId: b.batsmanId,
              firstName: b.batsman.firstName,
              lastName: b.batsman.lastName,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              dismissals: 0,
              highScore: 0,
              fifties: 0,
              hundreds: 0,
              inningsSet: new Set(),
            });
          }
          const bat = batsmanMap.get(b.batsmanId)!;
          bat.runs += b.runsScored;
          if (b.extraType !== 'WIDE') bat.balls += 1;
          if (b.isBoundaryFour) bat.fours += 1;
          if (b.isBoundarySix) bat.sixes += 1;
          bat.inningsSet.add(inn.id);

          // Bowling calculation
          if (!bowlerMap.has(b.bowlerId)) {
            bowlerMap.set(b.bowlerId, {
              playerId: b.bowlerId,
              firstName: b.bowler.firstName,
              lastName: b.bowler.lastName,
              legalBalls: 0,
              runsConceded: 0,
              wickets: 0,
              bestWickets: 0,
              bestRuns: 999,
              inningsMap: new Map(),
            });
          }
          const bowl = bowlerMap.get(b.bowlerId)!;
          if (b.isLegalBall) bowl.legalBalls += 1;

          let runsCharged = b.runsScored;
          if (b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE' && b.extraType !== 'PENALTY') {
            runsCharged += b.extraRuns;
          }
          bowl.runsConceded += runsCharged;

          if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT' && b.wicketType !== 'RETIRED_OUT') {
            bowl.wickets += 1;
          }

          if (!bowl.inningsMap.has(inn.id)) {
            bowl.inningsMap.set(inn.id, { runs: 0, wickets: 0 });
          }
          const bowlInn = bowl.inningsMap.get(inn.id)!;
          bowlInn.runs += runsCharged;
          if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'RETIRED_HURT' && b.wicketType !== 'RETIRED_OUT') {
            bowlInn.wickets += 1;
          }
        }

        // Check dismissals in this innings
        for (const b of inn.ballEvents) {
          if (b.isWicket && b.dismissedPlayerId && batsmanMap.has(b.dismissedPlayerId)) {
            if (b.wicketType !== 'RETIRED_HURT') {
              batsmanMap.get(b.dismissedPlayerId)!.dismissals += 1;
            }
          }
        }
      }
    }

    // Compute high score & milestones per batsman
    for (const match of competition.matches) {
      for (const inn of match.innings) {
        const innRuns = new Map<string, number>();
        for (const b of inn.ballEvents) {
          innRuns.set(b.batsmanId, (innRuns.get(b.batsmanId) || 0) + b.runsScored);
        }
        for (const [pId, runs] of innRuns.entries()) {
          const bat = batsmanMap.get(pId);
          if (bat) {
            if (runs > bat.highScore) bat.highScore = runs;
            if (runs >= 100) bat.hundreds += 1;
            else if (runs >= 50) bat.fifties += 1;
          }
        }
      }
    }

    // Compute best bowling figures per bowler
    bowlerMap.forEach((bowl) => {
      bowl.inningsMap.forEach((fig) => {
        if (fig.wickets > bowl.bestWickets || (fig.wickets === bowl.bestWickets && fig.runs < bowl.bestRuns)) {
          bowl.bestWickets = fig.wickets;
          bowl.bestRuns = fig.runs;
        }
      });
    });

    // Top Run Scorers (Orange Cap leaderboards)
    const topScorers = Array.from(batsmanMap.values())
      .map((b) => {
        const avg = b.dismissals > 0 ? Number((b.runs / b.dismissals).toFixed(2)) : b.runs;
        const sr = b.balls > 0 ? Number(((b.runs / b.balls) * 100).toFixed(2)) : 0.0;
        return {
          playerId: b.playerId,
          name: `${b.firstName} ${b.lastName}`,
          innings: b.inningsSet.size,
          runs: b.runs,
          balls: b.balls,
          average: avg,
          strikeRate: sr,
          highScore: b.highScore,
          fifties: b.fifties,
          hundreds: b.hundreds,
          fours: b.fours,
          sixes: b.sixes,
        };
      })
      .sort((a, b) => b.runs - a.runs || b.average - a.average)
      .slice(0, 10);

    // Top Wicket Takers (Purple Cap leaderboards)
    const topWicketTakers = Array.from(bowlerMap.values())
      .map((b) => {
        const oversNum = b.legalBalls / 6;
        const econ = oversNum > 0 ? Number((b.runsConceded / oversNum).toFixed(2)) : 0.0;
        const avg = b.wickets > 0 ? Number((b.runsConceded / b.wickets).toFixed(2)) : 0.0;
        return {
          playerId: b.playerId,
          name: `${b.firstName} ${b.lastName}`,
          innings: b.inningsMap.size,
          overs: `${Math.floor(b.legalBalls / 6)}.${b.legalBalls % 6}`,
          runsConceded: b.runsConceded,
          wickets: b.wickets,
          economy: econ,
          average: avg,
          bestBowling: b.bestWickets > 0 ? `${b.bestWickets}/${b.bestRuns}` : '—',
        };
      })
      .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
      .slice(0, 10);

    // Tournament Records
    const mostSixes = [...topScorers].sort((a, b) => b.sixes - a.sixes).slice(0, 5);
    const mostBoundaries = [...topScorers].sort((a, b) => (b.fours + b.sixes) - (a.fours + a.sixes)).slice(0, 5);
    const highestIndividualScores = [...topScorers].sort((a, b) => b.highScore - a.highScore).slice(0, 5);

    return {
      competition: {
        id: competition.id,
        name: competition.name,
        code: competition.code,
        format: competition.format,
        seasonYear: competition.seasonYear,
        status: competition.status,
      },
      topScorers,
      topWicketTakers,
      tournamentRecords: {
        highestIndividualScores,
        mostSixes,
        mostBoundaries,
      },
    };
  }

  /**
   * Generates administrative overview counts using fast database aggregates
   */
  static async getAdminDashboardOverview() {
    const [
      totalTournaments,
      activeTournaments,
      totalTeams,
      totalPlayers,
      totalMatches,
      liveMatches,
      completedMatches,
      scheduledMatches,
      totalLegalBalls,
      recentMatches,
    ] = await Promise.all([
      prisma.competition.count(),
      prisma.competition.count({ where: { status: { in: ['UPCOMING', 'ONGOING'] } } }),
      prisma.team.count(),
      prisma.player.count(),
      prisma.match.count(),
      prisma.match.count({ where: { status: { in: ['LIVE', 'INNINGS_BREAK', 'SUPER_OVER'] } } }),
      prisma.match.count({ where: { status: 'COMPLETED' } }),
      prisma.match.count({ where: { status: 'SCHEDULED' } }),
      prisma.ballEvent.count({ where: { isLegalBall: true } }),
      prisma.match.findMany({
        take: 5,
        orderBy: { matchDate: 'desc' },
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true } },
          awayTeam: { select: { id: true, name: true, shortName: true } },
          winner: { select: { id: true, name: true } },
          competition: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      summary: {
        totalTournaments,
        activeTournaments,
        totalTeams,
        totalPlayers,
        totalMatches,
        liveMatches,
        completedMatches,
        scheduledMatches,
        totalRecordedDeliveries: totalLegalBalls,
      },
      recentMatches,
    };
  }
}
