import { prisma } from './prisma.js';
import {
  MatchScorecardData,
  InningsScorecardData,
  BattingScorecardEntry,
  BowlingScorecardEntry,
  FallOfWicketEntry,
  PartnershipEntry,
  ExtrasSummary,
} from '../types/index.js';
import { AppError } from '../utils/appError.js';

export class ScorecardService {
  /**
   * Generates complete structured scorecard for a match
   */
  static async getMatchScorecard(matchId: string): Promise<MatchScorecardData> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        tossWinner: true,
        winner: true,
        matchPlayers: {
          include: { player: true },
        },
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

    const inningsScorecards: InningsScorecardData[] = match.innings.map((inn) => {
      return this.computeInningsScorecard(inn, match.oversLimit);
    });

    // Determine current active innings (last incomplete or last overall)
    const currentInnings =
      inningsScorecards.find((i) => !i.isCompleted) ||
      inningsScorecards[inningsScorecards.length - 1] ||
      null;

    // Collect commentary from all innings
    const commentaryList: MatchScorecardData['commentary'] = [];
    match.innings.forEach((inn) => {
      // Reverse order for commentary feed (most recent first)
      const reversedEvents = [...inn.ballEvents].reverse();
      reversedEvents.forEach((ev) => {
        const bowlerName = `${ev.bowler.firstName} ${ev.bowler.lastName}`;
        const batsmanName = `${ev.batsman.firstName} ${ev.batsman.lastName}`;
        
        let comment = ev.commentary;
        if (!comment) {
          comment = this.generateDefaultCommentary(ev, bowlerName, batsmanName);
        }

        commentaryList.push({
          id: ev.id,
          inningsNumber: inn.inningsNumber,
          overNumber: ev.overNumber,
          ballNumber: ev.ballNumber,
          bowlerName,
          batsmanName,
          runs: ev.runsScored + ev.extraRuns,
          text: comment,
          isWicket: ev.isWicket,
          isBoundary: ev.isBoundaryFour || ev.isBoundarySix,
          timestamp: ev.timestamp.toISOString(),
        });
      });
    });

    return {
      match: {
        id: match.id,
        title: match.title || `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        format: match.format,
        oversLimit: match.oversLimit,
        venue: match.venue,
        city: match.city,
        matchDate: match.matchDate.toISOString(),
        status: match.status as any,
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
        tossWinner: match.tossWinner ? { id: match.tossWinner.id, name: match.tossWinner.name } : null,
        tossDecision: match.tossDecision,
        winner: match.winner ? { id: match.winner.id, name: match.winner.name } : null,
        winMargin: match.winMargin,
        winType: match.winType,
        resultSummary: match.resultSummary,
        manOfTheMatch: match.manOfTheMatch,
      },
      innings: inningsScorecards,
      currentInnings,
      commentary: commentaryList,
    };
  }

  /**
   * Computes detailed batting, bowling, extras, partnerships, and fall-of-wickets for a single innings
   */
  static computeInningsScorecard(innings: any, oversLimit: number): InningsScorecardData {
    const balls = innings.ballEvents || [];

    const battingMap = new Map<string, BattingScorecardEntry>();
    const bowlingMap = new Map<string, {
      playerId: string;
      name: string;
      jerseyNumber?: number | null;
      legalBalls: number;
      maidens: number;
      runs: number;
      wickets: number;
      dots: number;
      wides: number;
      noBalls: number;
      oversMap: Map<number, { legalBalls: number; runs: number }>;
    }>();

    const fallOfWickets: FallOfWicketEntry[] = [];
    const partnerships: PartnershipEntry[] = [];

    const extras: ExtrasSummary = {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalty: 0,
      total: 0,
    };

    let runningTotalRuns = 0;
    let runningWickets = 0;
    let runningLegalBalls = 0;

    let currentPartRuns = 0;
    let currentPartBalls = 0;
    let currentPartPlayer1: { id: string; name: string; runs: number; balls: number } | null = null;
    let currentPartPlayer2: { id: string; name: string; runs: number; balls: number } | null = null;

    const getBattingEntry = (player: any): BattingScorecardEntry => {
      if (!battingMap.has(player.id)) {
        battingMap.set(player.id, {
          playerId: player.id,
          name: `${player.firstName} ${player.lastName}`,
          jerseyNumber: player.jerseyNumber,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0.0,
          isOut: false,
          dismissalText: 'not out',
          isOnStrike: false,
          isBatting: true,
        });
      }
      return battingMap.get(player.id)!;
    };

    const getBowlingEntry = (player: any) => {
      if (!bowlingMap.has(player.id)) {
        bowlingMap.set(player.id, {
          playerId: player.id,
          name: `${player.firstName} ${player.lastName}`,
          jerseyNumber: player.jerseyNumber,
          legalBalls: 0,
          maidens: 0,
          runs: 0,
          wickets: 0,
          dots: 0,
          wides: 0,
          noBalls: 0,
          oversMap: new Map(),
        });
      }
      return bowlingMap.get(player.id)!;
    };

    // Process every delivery in chronological order
    balls.forEach((b: any) => {
      const batsman = getBattingEntry(b.batsman);
      getBattingEntry(b.nonStriker); // ensure non-striker in card
      const bowler = getBowlingEntry(b.bowler);

      // Track bowler over stats for maiden calculation
      if (!bowler.oversMap.has(b.overNumber)) {
        bowler.oversMap.set(b.overNumber, { legalBalls: 0, runs: 0 });
      }
      const overTrack = bowler.oversMap.get(b.overNumber)!;

      // Runs calculation
      const runsOffBat = b.runsScored || 0;
      const extraRuns = b.extraRuns || 0;
      const totalBallRuns = runsOffBat + extraRuns;

      runningTotalRuns += totalBallRuns;

      // Batting stats
      batsman.runs += runsOffBat;
      if (b.isBoundaryFour) batsman.fours += 1;
      if (b.isBoundarySix) batsman.sixes += 1;

      // Balls faced (wides do NOT count as balls faced by batsman; no-balls do)
      if (b.extraType !== 'WIDE') {
        batsman.balls += 1;
      }

      // Bowling stats
      if (b.isLegalBall) {
        runningLegalBalls += 1;
        bowler.legalBalls += 1;
        overTrack.legalBalls += 1;
      }

      // Runs charged to bowler: all runs except BYES, LEG_BYES, and PENALTY
      if (b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE' && b.extraType !== 'PENALTY') {
        bowler.runs += totalBallRuns;
        overTrack.runs += totalBallRuns;
      } else {
        // Byes/leg byes: runs off bat (if any) to bowler, extras not to bowler
        bowler.runs += runsOffBat;
        overTrack.runs += runsOffBat;
      }

      if (totalBallRuns === 0) {
        bowler.dots += 1;
      }

      // Extras tracking
      if (b.extraType === 'WIDE') {
        extras.wides += extraRuns;
        bowler.wides += extraRuns;
      } else if (b.extraType === 'NO_BALL') {
        extras.noBalls += (b.extraRuns || 1);
        bowler.noBalls += (b.extraRuns || 1);
      } else if (b.extraType === 'BYE') {
        extras.byes += extraRuns;
      } else if (b.extraType === 'LEG_BYE') {
        extras.legByes += extraRuns;
      } else if (b.extraType === 'PENALTY') {
        extras.penalty += extraRuns;
      }
      extras.total = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalty;

      // Partnerships tracking
      currentPartRuns += totalBallRuns;
      if (b.extraType !== 'WIDE') {
        currentPartBalls += 1;
      }

      // Wickets handling
      if (b.isWicket) {
        runningWickets += 1;
        const dismissed = b.dismissedPlayer ? getBattingEntry(b.dismissedPlayer) : batsman;
        dismissed.isOut = true;
        dismissed.wicketType = b.wicketType;

        const bowlerName = `${b.bowler.firstName} ${b.bowler.lastName}`;
        const fielderName = b.fielder ? `${b.fielder.firstName} ${b.fielder.lastName}` : '';

        dismissed.bowlerName = bowlerName;
        dismissed.fielderName = fielderName;

        switch (b.wicketType) {
          case 'BOWLED':
            dismissed.dismissalText = `b ${bowlerName}`;
            bowler.wickets += 1;
            break;
          case 'CAUGHT':
            dismissed.dismissalText = `c ${fielderName || 'sub'} b ${bowlerName}`;
            bowler.wickets += 1;
            break;
          case 'LBW':
            dismissed.dismissalText = `lbw b ${bowlerName}`;
            bowler.wickets += 1;
            break;
          case 'STUMPED':
            dismissed.dismissalText = `st ${fielderName || 'wk'} b ${bowlerName}`;
            bowler.wickets += 1;
            break;
          case 'HIT_WICKET':
            dismissed.dismissalText = `hit wicket b ${bowlerName}`;
            bowler.wickets += 1;
            break;
          case 'RUN_OUT':
            dismissed.dismissalText = `run out (${fielderName || 'direct'})`;
            // Run out does NOT credit bowler with a wicket
            break;
          case 'RETIRED_HURT':
            dismissed.isOut = false;
            dismissed.dismissalText = 'retired hurt';
            break;
          case 'RETIRED_OUT':
            dismissed.dismissalText = 'retired out';
            break;
          default:
            dismissed.dismissalText = `out (${b.wicketType?.toLowerCase() || 'dismissed'})`;
            if (
              b.wicketType !== 'RUN_OUT' &&
              b.wicketType !== 'RETIRED_HURT' &&
              b.wicketType !== 'RETIRED_OUT' &&
              b.wicketType !== 'TIMED_OUT' &&
              b.wicketType !== 'OBSTRUCTING_FIELD'
            ) {
              bowler.wickets += 1;
            }
        }

        // Record Fall of Wicket
        const overNumberInt = Math.floor(runningLegalBalls / 6);
        const ballNumberOver = runningLegalBalls % 6;
        const formattedOvers = `${overNumberInt}.${ballNumberOver}`;

        fallOfWickets.push({
          wicketNumber: runningWickets,
          score: runningTotalRuns,
          overs: formattedOvers,
          playerId: dismissed.playerId,
          playerName: dismissed.name,
        });

        // Close current partnership
        partnerships.push({
          runs: currentPartRuns,
          balls: currentPartBalls,
          player1: {
            id: b.batsman.id,
            name: `${b.batsman.firstName} ${b.batsman.lastName}`,
            runs: 0,
            balls: 0,
          },
          player2: {
            id: b.nonStriker.id,
            name: `${b.nonStriker.firstName} ${b.nonStriker.lastName}`,
            runs: 0,
            balls: 0,
          },
          isCurrent: false,
        });

        currentPartRuns = 0;
        currentPartBalls = 0;
      }
    });

    // Compute strike rates for all batsmen
    battingMap.forEach((bat) => {
      bat.strikeRate = bat.balls > 0 ? Number(((bat.runs / bat.balls) * 100).toFixed(2)) : 0.0;
      if (bat.playerId === innings.currentStrikerId) bat.isOnStrike = true;
      if (bat.isOut) bat.isBatting = false;
    });

    // Compute overs & maidens & economy for all bowlers
    const bowlingArray: BowlingScorecardEntry[] = [];
    bowlingMap.forEach((bowl) => {
      const fullOvers = Math.floor(bowl.legalBalls / 6);
      const remBalls = bowl.legalBalls % 6;
      const oversStr = `${fullOvers}.${remBalls}`;
      const oversNum = fullOvers + remBalls / 6;

      // Maiden calculation: an over where 6 legal balls were bowled and 0 runs conceded
      let maidens = 0;
      bowl.oversMap.forEach((ot) => {
        if (ot.legalBalls >= 6 && ot.runs === 0) {
          maidens += 1;
        }
      });

      const economy = oversNum > 0 ? Number((bowl.runs / oversNum).toFixed(2)) : 0.0;

      bowlingArray.push({
        playerId: bowl.playerId,
        name: bowl.name,
        jerseyNumber: bowl.jerseyNumber,
        overs: oversStr,
        oversNumeric: oversNum,
        legalBalls: bowl.legalBalls,
        maidens,
        runs: bowl.runs,
        wickets: bowl.wickets,
        economy,
        dots: bowl.dots,
        wides: bowl.wides,
        noBalls: bowl.noBalls,
        isBowlingNow: bowl.playerId === innings.currentBowlerId,
      });
    });

    // Formatted current overs
    const fullOversTotal = Math.floor(runningLegalBalls / 6);
    const ballsInOver = runningLegalBalls % 6;
    const oversFormatted = `${fullOversTotal}.${ballsInOver}`;
    const totalOversNum = fullOversTotal + ballsInOver / 6;

    // Current Run Rate (CRR)
    const currentRunRate = totalOversNum > 0 ? Number((runningTotalRuns / totalOversNum).toFixed(2)) : 0.0;

    // Required Run Rate & equation for 2nd innings
    let requiredRuns: number | null = null;
    let requiredRunRate: number | null = null;
    let remainingBalls: number | null = null;

    if (innings.targetRuns != null && innings.targetRuns > 0) {
      requiredRuns = Math.max(0, innings.targetRuns - runningTotalRuns);
      const maxBalls = oversLimit * 6;
      remainingBalls = Math.max(0, maxBalls - runningLegalBalls);
      const remainingOvers = remainingBalls / 6;
      requiredRunRate = remainingOvers > 0 ? Number((requiredRuns / remainingOvers).toFixed(2)) : null;
    }

    // Recent 12 balls
    const recentBallsRaw = balls.slice(-12);
    const recentBalls = recentBallsRaw.map((b: any) => {
      let text = String(b.runsScored);
      if (b.isWicket) text = 'W';
      else if (b.extraType === 'WIDE') text = b.extraRuns > 1 ? `${b.extraRuns}Wd` : 'Wd';
      else if (b.extraType === 'NO_BALL') text = b.runsScored > 0 ? `${b.runsScored}Nb` : 'Nb';
      else if (b.extraType === 'BYE') text = `${b.extraRuns}B`;
      else if (b.extraType === 'LEG_BYE') text = `${b.extraRuns}Lb`;

      return {
        id: b.id,
        overNumber: b.overNumber,
        ballNumber: b.ballNumber,
        text,
        isWicket: b.isWicket,
        isBoundary: b.isBoundaryFour || b.isBoundarySix,
        runs: b.runsScored + b.extraRuns,
      };
    });

    // Active current batsman & bowler objects
    const currentStriker = innings.currentStrikerId ? battingMap.get(innings.currentStrikerId) : null;
    const currentNonStriker = innings.currentNonStrikerId ? battingMap.get(innings.currentNonStrikerId) : null;
    const currentBowlerObj = innings.currentBowlerId ? bowlingArray.find((b) => b.playerId === innings.currentBowlerId) : null;

    return {
      id: innings.id,
      inningsNumber: innings.inningsNumber,
      battingTeam: {
        id: innings.battingTeam.id,
        name: innings.battingTeam.name,
        shortName: innings.battingTeam.shortName,
        logoUrl: innings.battingTeam.logoUrl,
      },
      bowlingTeam: {
        id: innings.bowlingTeam.id,
        name: innings.bowlingTeam.name,
        shortName: innings.bowlingTeam.shortName,
        logoUrl: innings.bowlingTeam.logoUrl,
      },
      totalRuns: runningTotalRuns,
      wickets: runningWickets,
      oversFormatted,
      legalBalls: runningLegalBalls,
      currentRunRate,
      targetRuns: innings.targetRuns,
      requiredRuns,
      requiredRunRate,
      remainingBalls,
      isDeclared: innings.isDeclared,
      isCompleted: innings.isCompleted,
      currentStriker: currentStriker ? { id: currentStriker.playerId, name: currentStriker.name, runs: currentStriker.runs, balls: currentStriker.balls } : null,
      currentNonStriker: currentNonStriker ? { id: currentNonStriker.playerId, name: currentNonStriker.name, runs: currentNonStriker.runs, balls: currentNonStriker.balls } : null,
      currentBowler: currentBowlerObj ? { id: currentBowlerObj.playerId, name: currentBowlerObj.name, overs: currentBowlerObj.overs, runs: currentBowlerObj.runs, wickets: currentBowlerObj.wickets } : null,
      batting: Array.from(battingMap.values()),
      bowling: bowlingArray,
      extras,
      fallOfWickets,
      partnerships,
      recentBalls,
    };
  }

  /**
   * Generates clean sports commentary from ball metadata
   */
  private static generateDefaultCommentary(ev: any, bowler: string, batsman: string): string {
    if (ev.isWicket) {
      const fielder = ev.fielder ? ` by ${ev.fielder.firstName} ${ev.fielder.lastName}` : '';
      return `OUT! ${bowler} dismisses ${batsman}! (${ev.wicketType?.toLowerCase()}${fielder}).`;
    }
    if (ev.isBoundarySix) {
      return `SIX! ${bowler} to ${batsman}, massive strike over the boundary ropes! (${ev.runsScored} runs)`;
    }
    if (ev.isBoundaryFour) {
      return `FOUR! ${bowler} to ${batsman}, cracked through the field for four!`;
    }
    if (ev.extraType === 'WIDE') {
      return `WIDE! ${bowler} sprays it wide of the off stump. Extra run awarded.`;
    }
    if (ev.extraType === 'NO_BALL') {
      return `NO BALL! ${bowler} oversteps the crease. Free hit next! (${ev.runsScored + ev.extraRuns} runs total)`;
    }
    if (ev.extraType === 'BYE' || ev.extraType === 'LEG_BYE') {
      return `${bowler} to ${batsman}, ${ev.extraRuns} ${ev.extraType.toLowerCase()}(s) taken.`;
    }
    if (ev.runsScored === 0) {
      return `${bowler} to ${batsman}, no run. Good length ball defended into the covers.`;
    }
    if (ev.runsScored === 1) {
      return `${bowler} to ${batsman}, 1 run, pushed into the gap for a single.`;
    }
    return `${bowler} to ${batsman}, ${ev.runsScored} runs taken.`;
  }
}
