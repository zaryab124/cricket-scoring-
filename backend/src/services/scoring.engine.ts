import { prisma } from './prisma.js';
import { AppError } from '../utils/appError.js';
import { RecordBallDto, StartInningsDto } from '../types/index.js';
import { matchEventHub } from './events.service.js';

// In-memory match concurrency queue
const matchLocks = new Map<string, Promise<any>>();

async function withMatchLock<T>(matchId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = matchLocks.get(matchId) || Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  matchLocks.set(matchId, currentLock.then(() => nextLock, () => nextLock));

  await currentLock;
  try {
    return await fn();
  } finally {
    release!();
    if (matchLocks.get(matchId) === nextLock) {
      matchLocks.delete(matchId);
    }
  }
}

export class ScoringEngine {
  /**
   * Initializes or starts an innings with opening batsmen and bowler
   */
  static async startInnings(matchId: string, dto: StartInningsDto) {
    return withMatchLock(matchId, async () => {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { innings: true, homeTeam: true, awayTeam: true },
      });

    if (!match) {
      throw AppError.notFound('Match not found');
    }

    if (match.status === 'COMPLETED' || match.status === 'ABANDONED') {
      throw AppError.badRequest('Match is already concluded. Cannot start another innings.');
    }

    if (dto.strikerId === dto.nonStrikerId) {
      throw AppError.badRequest('Striker and Non-Striker must be different players');
    }

    if (dto.battingTeamId === dto.bowlingTeamId) {
      throw AppError.badRequest('Batting and Bowling teams must be different');
    }

    // Determine target if starting 2nd innings
    let targetRuns = dto.targetRuns;
    if (dto.inningsNumber === 2 && !targetRuns) {
      const firstInnings = match.innings.find((i) => i.inningsNumber === 1);
      if (firstInnings) {
        targetRuns = firstInnings.totalRuns + 1;
      }
    }

    // Create or update innings
    const innings = await prisma.innings.upsert({
      where: {
        id: match.innings.find((i) => i.inningsNumber === dto.inningsNumber)?.id || 'non-existent-id',
      },
      update: {
        currentStrikerId: dto.strikerId,
        currentNonStrikerId: dto.nonStrikerId,
        currentBowlerId: dto.bowlerId,
        targetRuns,
        isCompleted: false,
      },
      create: {
        matchId,
        inningsNumber: dto.inningsNumber,
        battingTeamId: dto.battingTeamId,
        bowlingTeamId: dto.bowlingTeamId,
        currentStrikerId: dto.strikerId,
        currentNonStrikerId: dto.nonStrikerId,
        currentBowlerId: dto.bowlerId,
        targetRuns,
      },
    });

    // Update match status to LIVE if scheduled or toss completed
    if (match.status === 'SCHEDULED' || match.status === 'TOSS_COMPLETED' || match.status === 'INNINGS_BREAK') {
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'LIVE' },
      });
    }

    matchEventHub.emitMatchUpdate(matchId, 'INNINGS_STARTED', { inningsId: innings.id, inningsNumber: dto.inningsNumber });
    return innings;
  });
  }

  /**
   * Records a single ball delivery and executes state transitions
   */
  static async recordBall(matchId: string, dto: RecordBallDto) {
    return withMatchLock(matchId, async () => {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: true,
          awayTeam: true,
          innings: {
            orderBy: { inningsNumber: 'desc' },
            take: 1,
            include: {
              ballEvents: {
                orderBy: [{ overNumber: 'asc' }, { ballNumber: 'asc' }],
              },
            },
          },
        },
      });

    if (!match) throw AppError.notFound('Match not found');

    if (match.status === 'COMPLETED' || match.status === 'ABANDONED') {
      throw AppError.badRequest('Match is already concluded. Cannot record further deliveries.');
    }

    const innings = match.innings[0];
    if (!innings) {
      throw AppError.badRequest('No active innings found for this match. Please start innings first.');
    }

    if (innings.isCompleted) {
      throw AppError.badRequest('Current innings is already marked as completed.');
    }

    if (innings.wickets >= 10) {
      throw AppError.badRequest('All 10 wickets have fallen in this innings. Innings is complete.');
    }

    if (!innings.currentStrikerId || !innings.currentNonStrikerId || !innings.currentBowlerId) {
      throw AppError.badRequest('Active striker, non-striker, or bowler is not set for this innings.');
    }

    const currentStrikerId = innings.currentStrikerId;
    const currentNonStrikerId = innings.currentNonStrikerId;
    const currentBowlerId = innings.currentBowlerId;

    // 1. Delivery validation & Legal status
    const isWide = dto.extraType === 'WIDE';
    const isNoBall = dto.extraType === 'NO_BALL';
    const isLegalBall = !isWide && !isNoBall;

    let runsScored = dto.runsScored || 0;
    let extraRuns = dto.extraRuns || 0;

    // Automatic extra runs for wide / no-ball
    if (isWide && extraRuns === 0) extraRuns = 1;
    if (isNoBall && extraRuns === 0) extraRuns = 1;

    // Boundaries flag check
    const isBoundaryFour = runsScored === 4;
    const isBoundarySix = runsScored === 6;

    // 2. Over & Ball Number Calculation
    const existingBalls = innings.ballEvents;
    let currentOverNumber = 1;
    let currentBallNumber = 1;
    let legalBallInOver = 0;

    if (existingBalls.length > 0) {
      const lastBall = existingBalls[existingBalls.length - 1];
      const ballsInLastOver = existingBalls.filter((b) => b.overNumber === lastBall.overNumber);
      const legalBallsInLastOver = ballsInLastOver.filter((b) => b.isLegalBall).length;

      if (legalBallsInLastOver >= 6) {
        // Last over completed, start next over
        currentOverNumber = lastBall.overNumber + 1;
        currentBallNumber = 1;
        legalBallInOver = isLegalBall ? 1 : 0;
      } else {
        // Still in same over
        currentOverNumber = lastBall.overNumber;
        currentBallNumber = ballsInLastOver.length + 1;
        legalBallInOver = isLegalBall ? legalBallsInLastOver + 1 : legalBallsInLastOver;
      }
    } else {
      legalBallInOver = isLegalBall ? 1 : 0;
    }

    // 3. Wicket Resolution
    const isWicket = !!dto.isWicket;
    let dismissedPlayerId: string | null = null;
    if (isWicket) {
      dismissedPlayerId = dto.dismissedPlayerId || currentStrikerId;
    }

    // 4. Save BallEvent
    const ballEvent = await prisma.ballEvent.create({
      data: {
        inningsId: innings.id,
        overNumber: currentOverNumber,
        ballNumber: currentBallNumber,
        legalBallNumber: isLegalBall ? legalBallInOver : null,
        isLegalBall,
        batsmanId: currentStrikerId,
        nonStrikerId: currentNonStrikerId,
        bowlerId: currentBowlerId,
        runsScored,
        extraRuns,
        extraType: dto.extraType || null,
        isWicket,
        wicketType: dto.wicketType || null,
        dismissedPlayerId,
        fielderId: dto.fielderId || null,
        isBoundaryFour,
        isBoundarySix,
        wagonZone: dto.wagonZone || null,
        ballSpeedKmph: dto.ballSpeedKmph || null,
        commentary: dto.customCommentary || null,
      },
    });

    // 5. Compute New Running Scores
    const totalBallRuns = runsScored + extraRuns;
    const newTotalRuns = innings.totalRuns + totalBallRuns;
    const newWickets = innings.wickets + (isWicket ? 1 : 0);
    const newLegalBalls = innings.legalBalls + (isLegalBall ? 1 : 0);

    const fullOvers = Math.floor(newLegalBalls / 6);
    const ballsInCurrentOver = newLegalBalls % 6;
    const newOvers = parseFloat(`${fullOvers}.${ballsInCurrentOver}`);

    let nextStrikerId = currentStrikerId;
    let nextNonStrikerId = currentNonStrikerId;

    // 6. Strike Rotation Logic
    // Runs that rotate physical batsman ends: odd bat runs, odd byes/leg-byes, odd wide runs
    let physicalRunsTaken = runsScored;
    if (dto.extraType === 'BYE' || dto.extraType === 'LEG_BYE') {
      physicalRunsTaken = extraRuns;
    } else if (dto.extraType === 'WIDE') {
      physicalRunsTaken = extraRuns - 1; // e.g. 2 wides = 1 wide penalty + 1 physical run
    }

    const isOddRuns = physicalRunsTaken % 2 !== 0;

    if (isOddRuns) {
      // Swap ends
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    // Handle new incoming batsman on dismissal
    if (isWicket) {
      if (dto.newBatsmanId) {
        if (dismissedPlayerId === nextStrikerId) {
          nextStrikerId = dto.newBatsmanId;
        } else if (dismissedPlayerId === nextNonStrikerId) {
          nextNonStrikerId = dto.newBatsmanId;
        }
      } else {
        // If no new batsman supplied yet, set dismissed slot to empty string or keep null
        if (dismissedPlayerId === nextStrikerId) nextStrikerId = '';
        else if (dismissedPlayerId === nextNonStrikerId) nextNonStrikerId = '';
      }
    }

    // End of Over Rotation (After 6th legal delivery)
    const isOverCompleted = isLegalBall && legalBallInOver === 6;
    if (isOverCompleted) {
      // At end of over, batsman at non-striker end becomes striker for next over
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    // Update extras tallies
    let wideRuns = innings.wideRuns;
    let noBallRuns = innings.noBallRuns;
    let byeRuns = innings.byeRuns;
    let legByeRuns = innings.legByeRuns;
    let penaltyRuns = innings.penaltyRuns;

    if (dto.extraType === 'WIDE') wideRuns += extraRuns;
    else if (dto.extraType === 'NO_BALL') noBallRuns += extraRuns;
    else if (dto.extraType === 'BYE') byeRuns += extraRuns;
    else if (dto.extraType === 'LEG_BYE') legByeRuns += extraRuns;
    else if (dto.extraType === 'PENALTY') penaltyRuns += extraRuns;

    // 7. Auto Completion Checks
    let isCompleted = false;
    let matchStatus: string = match.status;
    let winnerId: string | null = match.winnerId;
    let winMargin: number | null = match.winMargin;
    let winType: string | null = match.winType;
    let resultSummary: string | null = match.resultSummary;

    // All out (10 wickets) or Overs limit exhausted
    const isAllOut = newWickets >= 10;
    const isOversLimitReached = fullOvers >= match.oversLimit;

    // Check 2nd Innings Target Chase
    if (innings.inningsNumber === 2 && innings.targetRuns != null && innings.targetRuns > 0) {
      if (newTotalRuns >= innings.targetRuns) {
        // Batting Team won the match!
        isCompleted = true;
        matchStatus = 'COMPLETED';
        winnerId = innings.battingTeamId;
        const wicketsRemaining = 10 - newWickets;
        winMargin = wicketsRemaining;
        winType = 'WICKETS';
        const winningTeam = match.homeTeamId === innings.battingTeamId ? match.homeTeam : match.awayTeam;
        resultSummary = `${winningTeam.name} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
      } else if (isAllOut || isOversLimitReached) {
        // Bowling Team won or Tied
        isCompleted = true;
        matchStatus = 'COMPLETED';
        const runsDifference = innings.targetRuns - 1 - newTotalRuns;
        if (runsDifference > 0) {
          winnerId = innings.bowlingTeamId;
          winMargin = runsDifference;
          winType = 'RUNS';
          const winningTeam = match.homeTeamId === innings.bowlingTeamId ? match.homeTeam : match.awayTeam;
          resultSummary = `${winningTeam.name} won by ${runsDifference} run${runsDifference === 1 ? '' : 's'}`;
        } else {
          // Tied match
          winnerId = null;
          winType = 'TIED';
          resultSummary = 'Match Tied';
        }
      }
    } else if (innings.inningsNumber === 1 && (isAllOut || isOversLimitReached)) {
      // 1st Innings concluded -> Innings break
      isCompleted = true;
      matchStatus = 'INNINGS_BREAK';
    }

    // 8. Update Innings & Match in database
    const updatedInnings = await prisma.innings.update({
      where: { id: innings.id },
      data: {
        totalRuns: newTotalRuns,
        wickets: newWickets,
        overs: newOvers,
        legalBalls: newLegalBalls,
        currentStrikerId: nextStrikerId || null,
        currentNonStrikerId: nextNonStrikerId || null,
        currentBowlerId: isOverCompleted ? null : currentBowlerId, // Require bowler selection for next over
        wideRuns,
        noBallRuns,
        byeRuns,
        legByeRuns,
        penaltyRuns,
        isCompleted,
      },
    });

    if (matchStatus !== match.status || winnerId !== match.winnerId || resultSummary !== match.resultSummary) {
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: matchStatus,
          winnerId,
          winMargin,
          winType,
          resultSummary,
        },
      });
    }

    // 9. Dispatch real-time match event
    matchEventHub.emitMatchUpdate(matchId, 'BALL_RECORDED', {
      ballEvent,
      innings: updatedInnings,
      isOverCompleted,
    });

    return {
      ballEvent,
      innings: updatedInnings,
      isOverCompleted,
    };
  });
  }

  /**
   * Undoes the last delivery in the active innings with complete state rollback
   */
  static async undoLastBall(matchId: string) {
    return withMatchLock(matchId, async () => {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          innings: {
            orderBy: { inningsNumber: 'desc' },
            take: 1,
            include: {
              ballEvents: {
                orderBy: [{ overNumber: 'asc' }, { ballNumber: 'asc' }],
              },
            },
          },
        },
      });

    if (!match || match.innings.length === 0) {
      throw AppError.notFound('No active innings found to undo.');
    }

    const innings = match.innings[0];
    const balls = innings.ballEvents;
    if (balls.length === 0) {
      throw AppError.badRequest('No deliveries have been recorded yet in this innings to undo.');
    }

    const lastBall = balls[balls.length - 1];

    // Delete the last delivery
    await prisma.ballEvent.delete({
      where: { id: lastBall.id },
    });

    // Recalculate remaining deliveries
    const remainingBalls = balls.slice(0, balls.length - 1);

    let totalRuns = 0;
    let wickets = 0;
    let legalBalls = 0;
    let wideRuns = 0;
    let noBallRuns = 0;
    let byeRuns = 0;
    let legByeRuns = 0;
    let penaltyRuns = 0;

    remainingBalls.forEach((b) => {
      totalRuns += b.runsScored + b.extraRuns;
      if (b.isWicket) wickets += 1;
      if (b.isLegalBall) legalBalls += 1;

      if (b.extraType === 'WIDE') wideRuns += b.extraRuns;
      else if (b.extraType === 'NO_BALL') noBallRuns += b.extraRuns;
      else if (b.extraType === 'BYE') byeRuns += b.extraRuns;
      else if (b.extraType === 'LEG_BYE') legByeRuns += b.extraRuns;
      else if (b.extraType === 'PENALTY') penaltyRuns += b.extraRuns;
    });

    const fullOvers = Math.floor(legalBalls / 6);
    const remBalls = legalBalls % 6;
    const overs = parseFloat(`${fullOvers}.${remBalls}`);

    // Restore pre-ball striker, non-striker, and bowler
    const restoredStrikerId = lastBall.batsmanId;
    const restoredNonStrikerId = lastBall.nonStrikerId;
    const restoredBowlerId = lastBall.bowlerId;

    const updatedInnings = await prisma.innings.update({
      where: { id: innings.id },
      data: {
        totalRuns,
        wickets,
        overs,
        legalBalls,
        currentStrikerId: restoredStrikerId,
        currentNonStrikerId: restoredNonStrikerId,
        currentBowlerId: restoredBowlerId,
        wideRuns,
        noBallRuns,
        byeRuns,
        legByeRuns,
        penaltyRuns,
        isCompleted: false, // Re-open if completed by that ball
      },
    });

    // If match was marked completed, reopen to LIVE
    if (match.status === 'COMPLETED' || match.status === 'INNINGS_BREAK') {
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'LIVE',
          winnerId: null,
          winMargin: null,
          winType: null,
          resultSummary: null,
        },
      });
    }

    matchEventHub.emitMatchUpdate(matchId, 'BALL_UNDONE', {
      undoneBallId: lastBall.id,
      innings: updatedInnings,
    });

    return {
      message: 'Last delivery successfully undone.',
      undoneBall: lastBall,
      innings: updatedInnings,
    };
  });
  }

  /**
   * Sets the active bowler for the next over with consecutive over restriction check
   */
  static async changeBowler(matchId: string, bowlerId: string) {
    return withMatchLock(matchId, async () => {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          innings: {
            orderBy: { inningsNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!match || match.innings.length === 0) {
        throw AppError.notFound('Active innings not found');
      }

      if (match.status === 'COMPLETED' || match.status === 'ABANDONED') {
        throw AppError.badRequest('Match is already concluded.');
      }

      const innings = match.innings[0];

      // Check consecutive overs: find who bowled the immediately preceding completed over
      const lastBall = await prisma.ballEvent.findFirst({
        where: { inningsId: innings.id },
        orderBy: [{ overNumber: 'desc' }, { ballNumber: 'desc' }],
      });

      if (lastBall) {
        const legalCount = await prisma.ballEvent.count({
          where: {
            inningsId: innings.id,
            overNumber: lastBall.overNumber,
            isLegalBall: true,
          },
        });

        if (legalCount >= 6 && lastBall.bowlerId === bowlerId) {
          throw AppError.badRequest('A bowler cannot bowl two consecutive overs in cricket rules.');
        }
      }

      const updated = await prisma.innings.update({
        where: { id: innings.id },
        data: { currentBowlerId: bowlerId },
      });

      matchEventHub.emitMatchUpdate(matchId, 'BOWLER_CHANGED', { bowlerId });
      return updated;
    });
  }

  /**
   * Sets incoming batsman on strike or non-striker following a wicket
   */
  static async setNewBatsman(matchId: string, batsmanId: string, position: 'STRIKER' | 'NON_STRIKER') {
    return withMatchLock(matchId, async () => {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { innings: { orderBy: { inningsNumber: 'desc' }, take: 1 } },
      });

      if (!match || match.innings.length === 0) {
        throw AppError.notFound('Active innings not found');
      }

      if (match.status === 'COMPLETED' || match.status === 'ABANDONED') {
        throw AppError.badRequest('Match is already concluded.');
      }

      const innings = match.innings[0];

      if (position === 'STRIKER') {
        if (batsmanId === innings.currentNonStrikerId) {
          throw AppError.badRequest('Batsman is already at the non-striker end');
        }
        return prisma.innings.update({
          where: { id: innings.id },
          data: { currentStrikerId: batsmanId },
        });
      } else {
        if (batsmanId === innings.currentStrikerId) {
          throw AppError.badRequest('Batsman is already on strike');
        }
        return prisma.innings.update({
          where: { id: innings.id },
          data: { currentNonStrikerId: batsmanId },
        });
      }
    });
  }

  /**
   * Manually completes innings or declares
   */
  static async completeInnings(matchId: string, isDeclared = false) {
    return withMatchLock(matchId, async () => {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          innings: {
            orderBy: { inningsNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!match || match.innings.length === 0) {
        throw AppError.notFound('Active innings not found');
      }

      if (match.status === 'COMPLETED' || match.status === 'ABANDONED') {
        throw AppError.badRequest('Match is already concluded.');
      }

      const innings = match.innings[0];

      const updated = await prisma.innings.update({
        where: { id: innings.id },
        data: {
          isCompleted: true,
          isDeclared,
        },
      });

      const nextMatchStatus = innings.inningsNumber === 1 ? 'INNINGS_BREAK' : 'COMPLETED';
      await prisma.match.update({
        where: { id: matchId },
        data: { status: nextMatchStatus },
      });

      matchEventHub.emitMatchUpdate(matchId, 'INNINGS_COMPLETED', {
        inningsId: innings.id,
        inningsNumber: innings.inningsNumber,
        isDeclared,
      });

      return updated;
    });
  }
}
