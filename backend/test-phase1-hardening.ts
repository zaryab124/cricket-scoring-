import { prisma } from './src/services/prisma.js';
import { ScoringEngine } from './src/services/scoring.engine.js';
import { ScorecardService } from './src/services/scorecard.service.js';
import { PlayerService } from './src/services/player.service.js';
import { MatchService } from './src/services/match.service.js';
import { matchEventHub } from './src/services/events.service.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error('     Details:', details);
    failed++;
  }
}

async function runHardeningTests() {
  console.log('\n====================================================');
  console.log('🏏 CRICKET MASTER — PHASE 1 FINAL HARDENING & AUDIT');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // SETUP TEST FIXTURE WITH CLEAN PLAYERS & TEAMS
    // ----------------------------------------------------
    const [teamA, teamB] = await Promise.all([
      prisma.team.create({
        data: {
          name: 'Hardening Royals',
          shortName: 'HDR',
          code: 'HDR_' + Date.now().toString().slice(-4),
        },
      }),
      prisma.team.create({
        data: {
          name: 'Hardening Titans',
          shortName: 'HDT',
          code: 'HDT_' + Date.now().toString().slice(-4),
        },
      }),
    ]);

    const playersA: any[] = [];
    const playersB: any[] = [];

    for (let i = 1; i <= 11; i++) {
      playersA.push(
        await prisma.player.create({
          data: {
            firstName: `RoyalsBat${i}`,
            lastName: `Player`,
            jerseyNumber: i,
            battingStyle: 'RIGHT_HAND',
            bowlingStyle: i > 6 ? 'RIGHT_ARM_FAST' : 'NONE',
            playerRole: i <= 5 ? 'TOP_ORDER_BATTER' : i === 6 ? 'WICKET_KEEPER_BATTER' : 'FAST_BOWLER',
          },
        })
      );
      playersB.push(
        await prisma.player.create({
          data: {
            firstName: `TitansBowl${i}`,
            lastName: `Player`,
            jerseyNumber: i + 20,
            battingStyle: 'RIGHT_HAND',
            bowlingStyle: i > 5 ? 'RIGHT_ARM_FAST' : 'NONE',
            playerRole: i <= 5 ? 'TOP_ORDER_BATTER' : 'FAST_BOWLER',
          },
        })
      );
    }

    const testMatch = await MatchService.createMatch({
      homeTeamId: teamA.id,
      awayTeamId: teamB.id,
      venue: 'Lord’s Cricket Ground, London',
      format: 'T20',
      oversLimit: 20,
      matchDate: new Date(),
    });

    await MatchService.setSquads(testMatch.id, {
      homeTeamSquad: playersA.map((p, idx) => ({ playerId: p.id, isPlayingXI: true, battingOrder: idx + 1 })),
      awayTeamSquad: playersB.map((p, idx) => ({ playerId: p.id, isPlayingXI: true, battingOrder: idx + 1 })),
    });

    const b1 = playersA[0]; // Striker
    const b2 = playersA[1]; // Non-striker
    const b3 = playersA[2]; // Next batsman
    const b4 = playersA[3];
    const bowl1 = playersB[6]; // Bowler 1
    const bowl2 = playersB[7]; // Bowler 2

    // ----------------------------------------------------
    // SECTION A: NO-BALL SCENARIOS
    // ----------------------------------------------------
    console.log('--- SECTION A: No-Ball Scenarios ---');
    await ScoringEngine.startInnings(testMatch.id, {
      inningsNumber: 1,
      battingTeamId: teamA.id,
      bowlingTeamId: teamB.id,
      strikerId: b1.id,
      nonStrikerId: b2.id,
      bowlerId: bowl1.id,
    });

    // A1. No-ball + 0 bat runs
    const resA1 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 0,
      extraRuns: 1,
      extraType: 'NO_BALL',
    });
    assert(resA1.innings.totalRuns === 1, 'No-ball + 0 bat runs awards 1 run to team');
    assert(resA1.innings.legalBalls === 0, 'No-ball does NOT increment legal ball counter');
    assert(resA1.innings.noBallRuns === 1, 'No-ball penalty tracked in innings noBallRuns');
    assert(resA1.innings.currentStrikerId === b1.id, 'Strike remains with striker on No-Ball + 0 runs');

    // A2. No-ball + 1 bat run
    const resA2 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 1,
      extraRuns: 1,
      extraType: 'NO_BALL',
    });
    assert(resA2.innings.totalRuns === 3, 'No-ball + 1 bat run adds 2 runs total (1 bat + 1 penalty)');
    assert(resA2.innings.legalBalls === 0, 'No-ball with bat run does NOT count as legal ball');
    assert(resA2.innings.currentStrikerId === b2.id, 'Odd runs on No-Ball correctly rotates strike to Non-Striker');

    // A3. No-ball + 4 bat runs
    const resA3 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 4,
      extraRuns: 1,
      extraType: 'NO_BALL',
    });
    assert(resA3.innings.totalRuns === 8, 'No-ball + 4 bat runs adds 5 runs total');
    assert(resA3.ballEvent.isBoundaryFour === true, 'No-ball + 4 bat runs flags isBoundaryFour');

    // A4. No-ball + 6 bat runs
    const resA4 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 6,
      extraRuns: 1,
      extraType: 'NO_BALL',
    });
    assert(resA4.innings.totalRuns === 15, 'No-ball + 6 bat runs adds 7 runs total');
    assert(resA4.ballEvent.isBoundarySix === true, 'No-ball + 6 bat runs flags isBoundarySix');
    assert(resA4.innings.legalBalls === 0, 'All no-balls preserve legalBalls === 0');

    // Check batsman scorecard for no-balls faced
    const cardA = await ScorecardService.getMatchScorecard(testMatch.id);
    const bat1Card = cardA.currentInnings!.batting.find((b) => b.playerId === b1.id);
    const bat2Card = cardA.currentInnings!.batting.find((b) => b.playerId === b2.id);
    const bowl1Card = cardA.currentInnings!.bowling.find((b) => b.playerId === bowl1.id);

    assert(bat1Card!.runs === 1, 'Striker 1 credited with 1 run from NB single');
    assert(bat2Card!.runs === 10, 'Striker 2 credited with 10 runs (4 + 6) from NBs');
    assert(bat2Card!.balls === 2, 'Batsman charged with balls faced for facing No-Balls');
    assert(bowl1Card!.runs === 15, 'Bowler charged with all bat runs + penalties from No-Balls');
    assert(bowl1Card!.noBalls === 4, 'Bowler no-ball count tracked accurately (4 NBs)');

    // ----------------------------------------------------
    // SECTION B: WIDE SCENARIOS
    // ----------------------------------------------------
    console.log('\n--- SECTION B: Wide Scenarios ---');
    // B1. Simple wide
    const resB1 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 0,
      extraRuns: 1,
      extraType: 'WIDE',
    });
    assert(resB1.innings.totalRuns === 16, 'Simple wide awards 1 extra run');
    assert(resB1.innings.legalBalls === 0, 'Wide does NOT increment legal ball counter');
    assert(resB1.innings.currentStrikerId === b2.id, 'Simple wide does not rotate strike');

    // B2. Wide + 1 additional run (e.g. batsman ran a bye on wide)
    const resB2 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 0,
      extraRuns: 2,
      extraType: 'WIDE',
    });
    assert(resB2.innings.totalRuns === 18, 'Wide + 1 run adds 2 extra runs total');
    assert(resB2.innings.currentStrikerId === b1.id, 'Wide + 1 run rotates strike (odd completed run)');

    // B3. 5 Wides (Wide + 4 overthrows/boundary)
    const resB3 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 0,
      extraRuns: 5,
      extraType: 'WIDE',
    });
    assert(resB3.innings.totalRuns === 23, '5 Wides adds 5 extra runs total');
    assert(resB3.innings.currentStrikerId === b1.id, '5 Wides does not rotate strike (even completed runs)');

    const cardB = await ScorecardService.getMatchScorecard(testMatch.id);
    const bat1CardB = cardB.currentInnings!.batting.find((b) => b.playerId === b1.id);
    const bat2CardB = cardB.currentInnings!.batting.find((b) => b.playerId === b2.id);
    assert(bat1CardB!.balls === 2, 'Batsman 1 balls faced not incremented by Wides (remains 2 from NBs)');
    assert(bat2CardB!.balls === 2, 'Batsman 2 balls faced not incremented by Wides (remains 2 from NBs)');
    const bowl1CardB = cardB.currentInnings!.bowling.find((b) => b.playerId === bowl1.id);
    assert(bowl1CardB!.wides === 8, 'Bowler charged with all wide extras (1 + 2 + 5 = 8)');

    // ----------------------------------------------------
    // SECTION C: BYE & LEG-BYE SCENARIOS
    // ----------------------------------------------------
    console.log('\n--- SECTION C: Bye & Leg-Bye Scenarios ---');
    const bowlRunsBeforeByes = bowl1CardB!.runs;

    // C1. Bye 1
    const resC1 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 0,
      extraRuns: 1,
      extraType: 'BYE',
    });
    assert(resC1.innings.totalRuns === 24, 'Bye 1 adds 1 run to team total');
    assert(resC1.innings.legalBalls === 1, 'Bye counts as a legal delivery');
    assert(resC1.innings.currentStrikerId === b2.id, 'Bye 1 rotates strike (odd runs)');

    // C2. Leg Bye 2
    const resC2 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 0,
      extraRuns: 2,
      extraType: 'LEG_BYE',
    });
    assert(resC2.innings.totalRuns === 26, 'Leg Bye 2 adds 2 runs to team total');
    assert(resC2.innings.legalBalls === 2, 'Leg Bye counts as a legal delivery');
    assert(resC2.innings.currentStrikerId === b2.id, 'Leg Bye 2 does not rotate strike (even runs)');

    // C3. Bye 4
    const resC3 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 0,
      extraRuns: 4,
      extraType: 'BYE',
    });
    assert(resC3.innings.totalRuns === 30, 'Bye 4 adds 4 runs to team total');
    assert(resC3.innings.legalBalls === 3, 'Bye 4 counts as a legal delivery (3 legal balls)');

    const cardC = await ScorecardService.getMatchScorecard(testMatch.id);
    const bowl1CardC = cardC.currentInnings!.bowling.find((b) => b.playerId === bowl1.id);
    assert(bowl1CardC!.runs === bowlRunsBeforeByes, 'Bowler is NOT charged for Byes and Leg Byes');
    assert(cardC.currentInnings!.extras.byes === 5, 'Extras byes summary is accurate (1 + 4 = 5)');
    assert(cardC.currentInnings!.extras.legByes === 2, 'Extras legByes summary is accurate (2)');

    // ----------------------------------------------------
    // SECTION D: ALL DISMISSAL TYPES & BOWLER CREDIT AUDIT
    // ----------------------------------------------------
    console.log('\n--- SECTION D: All Dismissal Types & Bowler Credits ---');
    // Complete remaining balls of over 1 with dots
    await ScoringEngine.recordBall(testMatch.id, { runsScored: 0 }); // ball 4
    await ScoringEngine.recordBall(testMatch.id, { runsScored: 0 }); // ball 5
    await ScoringEngine.recordBall(testMatch.id, { runsScored: 0 }); // ball 6 (over 1 complete)

    // Over 2: Bowler 2
    await ScoringEngine.changeBowler(testMatch.id, bowl2.id);

    // D1. BOWLED (Over 2 Ball 1)
    const resD1 = await ScoringEngine.recordBall(testMatch.id, {
      isWicket: true,
      wicketType: 'BOWLED',
      newBatsmanId: b3.id,
    });
    assert(resD1.innings.wickets === 1, 'BOWLED increases innings wickets count to 1');
    assert(resD1.innings.currentStrikerId === b3.id, 'New batsman comes in as striker for bowled dismissal');

    // D2. CAUGHT (Over 2 Ball 2)
    const resD2 = await ScoringEngine.recordBall(testMatch.id, {
      isWicket: true,
      wicketType: 'CAUGHT',
      fielderId: playersB[0].id,
      newBatsmanId: b4.id,
    });
    assert(resD2.innings.wickets === 2, 'CAUGHT increases innings wickets count to 2');

    // D3. LBW (Over 2 Ball 3)
    const resD3 = await ScoringEngine.recordBall(testMatch.id, {
      isWicket: true,
      wicketType: 'LBW',
      newBatsmanId: playersA[4].id,
    });
    assert(resD3.innings.wickets === 3, 'LBW increases innings wickets count to 3');

    // D4. STUMPED (Over 2 Ball 4)
    const resD4 = await ScoringEngine.recordBall(testMatch.id, {
      isWicket: true,
      wicketType: 'STUMPED',
      fielderId: playersB[5].id, // keeper
      newBatsmanId: playersA[5].id,
    });
    assert(resD4.innings.wickets === 4, 'STUMPED increases innings wickets count to 4');

    // D5. HIT_WICKET (Over 2 Ball 5)
    const resD5 = await ScoringEngine.recordBall(testMatch.id, {
      isWicket: true,
      wicketType: 'HIT_WICKET',
      newBatsmanId: playersA[6].id,
    });
    assert(resD5.innings.wickets === 5, 'HIT_WICKET increases innings wickets count to 5');

    // D6. RUN_OUT (Over 2 Ball 6) - 1 run completed before run out
    const resD6 = await ScoringEngine.recordBall(testMatch.id, {
      runsScored: 1,
      isWicket: true,
      wicketType: 'RUN_OUT',
      dismissedPlayerId: playersA[6].id,
      fielderId: playersB[1].id,
      newBatsmanId: playersA[7].id,
    });
    assert(resD6.innings.wickets === 6, 'RUN_OUT increases innings wickets count to 6');

    const cardD = await ScorecardService.getMatchScorecard(testMatch.id);
    const bowl2Card = cardD.currentInnings!.bowling.find((b) => b.playerId === bowl2.id);
    assert(bowl2Card!.wickets === 5, 'Bowler 2 credited with EXACTLY 5 wickets (RUN_OUT excluded)');
    assert(cardD.currentInnings!.fallOfWickets.length === 6, 'Fall of wickets recorded all 6 dismissals');

    // ----------------------------------------------------
    // SECTION E: OVER MANAGEMENT & CONSECUTIVE BOWLER RULE
    // ----------------------------------------------------
    console.log('\n--- SECTION E: Over Management & Consecutive Bowler Restriction ---');
    // Bowler 2 just bowled Over 2. Trying to assign Bowler 2 for Over 3 must be blocked!
    let consecutiveBlocked = false;
    try {
      await ScoringEngine.changeBowler(testMatch.id, bowl2.id);
    } catch (e: any) {
      consecutiveBlocked = true;
    }
    assert(consecutiveBlocked, 'Scoring engine strictly prevents same bowler from bowling consecutive overs');

    // Assign Bowler 1 for Over 3
    const bowlChangeOk = await ScoringEngine.changeBowler(testMatch.id, bowl1.id);
    assert(bowlChangeOk.currentBowlerId === bowl1.id, 'Assigning different bowler for new over succeeds');

    // ----------------------------------------------------
    // SECTION F: UNDO / ROLLBACK INTEGRITY TEST
    // ----------------------------------------------------
    console.log('\n--- SECTION F: Undo / Rollback Verification ---');
    // Record a 6-run delivery then undo it
    const runsBeforeSix = (await ScorecardService.getMatchScorecard(testMatch.id)).currentInnings!.totalRuns;
    await ScoringEngine.recordBall(testMatch.id, { runsScored: 6 });
    const runsAfterSix = (await ScorecardService.getMatchScorecard(testMatch.id)).currentInnings!.totalRuns;
    assert(runsAfterSix === runsBeforeSix + 6, 'Recorded six successfully');

    await ScoringEngine.undoLastBall(testMatch.id);
    const runsAfterUndo = (await ScorecardService.getMatchScorecard(testMatch.id)).currentInnings!.totalRuns;
    assert(runsAfterUndo === runsBeforeSix, 'Undo delivery completely rolled back score to pre-delivery total');

    // ----------------------------------------------------
    // SECTION G: TARGET CHASE & MATCH AUTO-COMPLETION
    // ----------------------------------------------------
    console.log('\n--- SECTION G: Target Chase & Auto Completion ---');
    // Complete 1st innings
    await ScoringEngine.completeInnings(testMatch.id);
    const final1stScore = (await ScorecardService.getMatchScorecard(testMatch.id)).innings[0].totalRuns;
    const expectedTarget = final1stScore + 1;

    // Start 2nd innings for Team B
    const inn2 = await ScoringEngine.startInnings(testMatch.id, {
      inningsNumber: 2,
      battingTeamId: teamB.id,
      bowlingTeamId: teamA.id,
      strikerId: playersB[0].id,
      nonStrikerId: playersB[1].id,
      bowlerId: playersA[8].id,
    });
    assert(inn2.targetRuns === expectedTarget, `2nd innings target accurately computed (${expectedTarget} runs)`);

    // Score runs until reaching target
    let runsNeeded = expectedTarget;
    while (runsNeeded > 6) {
      await ScoringEngine.recordBall(testMatch.id, { runsScored: 6 });
      runsNeeded -= 6;
    }
    // Final winning boundary
    const winningRes = await ScoringEngine.recordBall(testMatch.id, { runsScored: runsNeeded });
    assert(winningRes.innings.isCompleted === true, '2nd innings auto-completed upon reaching target');

    const finalMatch = await MatchService.getMatchById(testMatch.id);
    assert(finalMatch.status === 'COMPLETED', 'Match status automatically set to COMPLETED');
    assert(finalMatch.winnerId === teamB.id, 'Winner accurately assigned to chasing team (Hardening Titans)');
    assert(finalMatch.winType === 'WICKETS', 'Win type assigned to WICKETS');
    assert(finalMatch.winMargin === 10, 'Win margin accurately computed as 10 wickets remaining');

    // Attempting to record ball after match completion must be rejected
    let postMatchBlocked = false;
    try {
      await ScoringEngine.recordBall(testMatch.id, { runsScored: 1 });
    } catch (e: any) {
      postMatchBlocked = true;
    }
    assert(postMatchBlocked, 'Scoring engine rejects ball recording on completed match');

    // ----------------------------------------------------
    // SECTION H: CAREER STATS AUDIT (RETIRED_HURT & RUN_OUT)
    // ----------------------------------------------------
    console.log('\n--- SECTION H: Career Statistics Consistency ---');
    const bowl2Career = await PlayerService.computeCareerStats(bowl2.id);
    assert(bowl2Career.bowling.wickets === 5, 'Bowler career stats accurately reflects 5 wickets (RUN_OUT excluded)');
    assert(bowl2Career.bowling.fiveWicketHauls === 1, '5-wicket haul milestone recorded for 5/X figures');

    // ----------------------------------------------------
    // SECTION I: SSE HUB MULTI-CLIENT & DISCONNECT TEST
    // ----------------------------------------------------
    console.log('\n--- SECTION I: SSE Real-Time Event Hub ---');
    let sseEventsCount = 0;
    const unsub1 = matchEventHub.subscribeMatch(testMatch.id, (data) => {
      if (data.eventType === 'TEST_SSE') sseEventsCount++;
    });
    const unsub2 = matchEventHub.subscribeMatch(testMatch.id, (data) => {
      if (data.eventType === 'TEST_SSE') sseEventsCount++;
    });

    matchEventHub.emitMatchUpdate(testMatch.id, 'TEST_SSE', { test: true });
    assert(sseEventsCount === 2, 'Multi-client SSE subscribers receive match events simultaneously');

    unsub1();
    unsub2();
    matchEventHub.emitMatchUpdate(testMatch.id, 'TEST_SSE', { test: true });
    assert(sseEventsCount === 2, 'Unsubscribed SSE clients cleanly detached without memory leak');

    // ----------------------------------------------------
    // SECTION J: SQUAD XI LIMIT ENFORCEMENT
    // ----------------------------------------------------
    console.log('\n--- SECTION J: Squad Playing XI Validation ---');
    const extraPlayer = await prisma.player.create({
      data: { firstName: 'Extra12th', lastName: 'Player', battingStyle: 'RIGHT_HAND' },
    });

    let xiLimitEnforced = false;
    try {
      await MatchService.setSquads(testMatch.id, {
        homeTeamSquad: [
          ...playersA.map((p) => ({ playerId: p.id, isPlayingXI: true })),
          { playerId: extraPlayer.id, isPlayingXI: true },
        ],
      });
    } catch (e: any) {
      xiLimitEnforced = true;
    }
    assert(xiLimitEnforced, 'Playing XI strictly rejects more than 11 players per team');

  } catch (error: any) {
    console.error('Test execution error:', error);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`🏁 HARDENING SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runHardeningTests();
