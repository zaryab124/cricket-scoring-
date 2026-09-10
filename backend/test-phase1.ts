import { createApp } from './src/app.js';
import { prisma } from './src/services/prisma.js';
import http from 'http';

const app = createApp();
const PORT = 5099;

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('🏏 CRICKET MASTER - PHASE 1 CORE CRICKET SYSTEM TESTS');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`🚀 Phase 1 test server listening on http://localhost:${PORT}`);

  const baseUrl = `http://localhost:${PORT}/api/v1`;

  const fetchJson = async (url: string, options: any = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, extra?: string) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  };

  try {
    // 1. Authenticate Actors
    console.log('\n--- 1. Authenticating Roles ---');
    const scorerLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'scorer@cricketmaster.io', password: 'Password@123' }),
    });
    assert(scorerLogin.status === 200, 'Scorer authenticated successfully');
    const scorerToken = scorerLogin.data.data.accessToken;

    const adminLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'superadmin@cricketmaster.io', password: 'Password@123' }),
    });
    assert(adminLogin.status === 200, 'Super Admin authenticated');
    const adminToken = adminLogin.data.data.accessToken;

    // 2. Player Management & Career Statistics
    console.log('\n--- 2. Player Management & Dynamic Career Stats ---');
    const playersList = await fetchJson(`${baseUrl}/players?limit=100`);
    assert(playersList.status === 200 && playersList.data.data.length >= 20, 'Players catalog returns full roster');
    const rohit = playersList.data.data.find((p: any) => p.firstName === 'Rohit');
    const bumrah = playersList.data.data.find((p: any) => p.firstName === 'Jasprit');

    assert(!!rohit && !!bumrah, 'Key players Rohit and Bumrah identified in catalog');

    // Fetch Rohit's career stats
    const rohitProfile = await fetchJson(`${baseUrl}/players/${rohit.id}`);
    assert(
      rohitProfile.status === 200 &&
      rohitProfile.data.data.careerStats?.batting?.runs > 0,
      `Rohit Sharma career stats calculated dynamically (Runs: ${rohitProfile.data.data.careerStats?.batting?.runs}, SR: ${rohitProfile.data.data.careerStats?.batting?.strikeRate})`
    );

    // Fetch Bumrah's bowling stats
    const bumrahProfile = await fetchJson(`${baseUrl}/players/${bumrah.id}`);
    assert(
      bumrahProfile.status === 200 &&
      bumrahProfile.data.data.careerStats?.bowling?.wickets > 0,
      `Jasprit Bumrah bowling figures calculated dynamically (Wickets: ${bumrahProfile.data.data.careerStats?.bowling?.wickets}, Economy: ${bumrahProfile.data.data.careerStats?.bowling?.economy})`
    );

    // Update Player Profile
    const updatePlayer = await fetchJson(`${baseUrl}/players/${rohit.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ bio: 'Modern legend and explosive opening batter.' }),
    });
    assert(updatePlayer.status === 200 && updatePlayer.data.data.bio.includes('Modern legend'), 'Player profile updated');

    // 3. Team Management & Squad Roles
    console.log('\n--- 3. Team Management & Squad History ---');
    const teamsList = await fetchJson(`${baseUrl}/teams?limit=100`);
    const mumTeam = teamsList.data.data.find((t: any) => t.code === 'MUM-STR');
    const blrTeam = teamsList.data.data.find((t: any) => t.code === 'BLR-TIT');
    assert(!!mumTeam && !!blrTeam, 'Mumbai Strikers and Bangalore Titans clubs verified');

    const squadHistory = await fetchJson(`${baseUrl}/teams/${mumTeam.id}/history`);
    assert(
      squadHistory.status === 200 &&
      squadHistory.data.data.activeMembers.length >= 11,
      `Mumbai Strikers squad history verified (${squadHistory.data.data.activeMembers.length} active players)`
    );

    // 4. Match Creation, Toss & Squad Assignment
    console.log('\n--- 4. Match Creation, Toss & Playing XI ---');
    const createMatchRes = await fetchJson(`${baseUrl}/matches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'T20 Test Championship Final',
        format: 'T20',
        oversLimit: 2, // 2-over match for fast end-to-end testing
        venue: 'Eden Gardens',
        city: 'Kolkata',
        matchDate: new Date().toISOString(),
        homeTeamId: mumTeam.id,
        awayTeamId: blrTeam.id,
        scorerId: scorerLogin.data.data.user.id,
      }),
    });
    assert(createMatchRes.status === 201 && !!createMatchRes.data.data.id, 'Test match fixture created (2 overs limit)');
    const testMatchId = createMatchRes.data.data.id;

    // Record Toss
    const tossRes = await fetchJson(`${baseUrl}/matches/${testMatchId}/toss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        tossWinnerId: mumTeam.id,
        tossDecision: 'BAT',
      }),
    });
    assert(
      tossRes.status === 200 && tossRes.data.data.status === 'TOSS_COMPLETED',
      'Toss recorded: Mumbai Strikers elected to BAT -> Match status: TOSS_COMPLETED'
    );

    // Assign Playing XI
    const mumSquad = squadHistory.data.data.activeMembers.slice(0, 11).map((m: any, idx: number) => ({
      playerId: m.playerId,
      isPlayingXI: true,
      battingOrder: idx + 1,
      isCaptain: m.isCaptain,
      isViceCaptain: m.isViceCaptain,
      isWicketKeeper: m.isWicketKeeper,
    }));

    const blrSquadHistory = await fetchJson(`${baseUrl}/teams/${blrTeam.id}/history`);
    const blrSquad = blrSquadHistory.data.data.activeMembers.slice(0, 11).map((m: any, idx: number) => ({
      playerId: m.playerId,
      isPlayingXI: true,
      battingOrder: idx + 1,
      isCaptain: m.isCaptain,
      isViceCaptain: m.isViceCaptain,
      isWicketKeeper: m.isWicketKeeper,
    }));

    const setSquadsRes = await fetchJson(`${baseUrl}/matches/${testMatchId}/squads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        homeTeamSquad: mumSquad,
        awayTeamSquad: blrSquad,
      }),
    });
    assert(
      setSquadsRes.status === 200 &&
      setSquadsRes.data.data.homeTeam.playingXI.length === 11 &&
      setSquadsRes.data.data.awayTeam.playingXI.length === 11,
      'Playing XI (11 players per team) successfully assigned'
    );

    // 5. Cricket Scoring Engine: 1st Innings
    console.log('\n--- 5. Scoring Engine: 1st Innings Execution ---');
    const pStriker = mumSquad[0].playerId; // Rohit
    const pNonStriker = mumSquad[1].playerId; // Ishan
    const pBowler1 = blrSquad[7].playerId; // Siraj
    const pBowler2 = blrSquad[9].playerId; // Ferguson

    // Start 1st Innings
    const startInn1 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        inningsNumber: 1,
        battingTeamId: mumTeam.id,
        bowlingTeamId: blrTeam.id,
        strikerId: pStriker,
        nonStrikerId: pNonStriker,
        bowlerId: pBowler1,
      }),
    });
    assert(startInn1.status === 200, '1st Innings started -> Match status is LIVE');

    // Over 1 - Ball 1: Dot Ball (0 runs)
    const ball1_1 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 0 }),
    });
    assert(
      ball1_1.status === 200 &&
      ball1_1.data.data.innings.totalRuns === 0 &&
      ball1_1.data.data.innings.overs === 0.1,
      'Ball 1.1: Dot ball recorded (0/0 in 0.1 overs)'
    );

    // Over 1 - Ball 2: Single (1 run -> strike rotation check)
    const ball1_2 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 1 }),
    });
    assert(
      ball1_2.status === 200 &&
      ball1_2.data.data.innings.totalRuns === 1 &&
      ball1_2.data.data.innings.currentStrikerId === pNonStriker,
      'Ball 1.2: Single (1 run) -> Strike correctly rotated to non-striker'
    );

    // Over 1 - Ball 3: Wide (+1 extra run, ball count NOT incremented)
    const ball1_3 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 0, extraRuns: 1, extraType: 'WIDE' }),
    });
    assert(
      ball1_3.status === 200 &&
      ball1_3.data.data.innings.totalRuns === 2 &&
      ball1_3.data.data.innings.overs === 0.2, // Still 0.2 overs
      'Ball 1.3: Wide ball recorded (1 extra, legal balls unchanged at 2)'
    );

    // Over 1 - Ball 4: Boundary Four (4 runs, no strike swap)
    const ball1_4 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 4 }),
    });
    assert(
      ball1_4.status === 200 &&
      ball1_4.data.data.innings.totalRuns === 6 &&
      ball1_4.data.data.innings.currentStrikerId === pNonStriker,
      'Ball 1.3 legal: Boundary Four recorded (6/0 in 0.3 overs)'
    );

    // Over 1 - Ball 5: Six (6 runs)
    const ball1_5 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 6 }),
    });
    assert(ball1_5.status === 200 && ball1_5.data.data.innings.totalRuns === 12, 'Ball 1.4 legal: Six recorded (12/0)');

    // Over 1 - Ball 6: Wicket (Caught, new batsman comes in)
    const pNewBatsman = mumSquad[2].playerId; // Suryakumar
    const ball1_6 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        runsScored: 0,
        isWicket: true,
        wicketType: 'CAUGHT',
        dismissedPlayerId: pNonStriker,
        fielderId: blrSquad[0].playerId,
        newBatsmanId: pNewBatsman,
      }),
    });
    assert(
      ball1_6.status === 200 &&
      ball1_6.data.data.innings.wickets === 1 &&
      ball1_6.data.data.innings.currentStrikerId === pNewBatsman,
      'Ball 1.5 legal: Wicket (CAUGHT) -> 12/1, new batsman at crease'
    );

    // Over 1 - Ball 7 (6th legal): Single to complete over
    const ball1_7 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 1 }),
    });
    assert(
      ball1_7.status === 200 &&
      ball1_7.data.data.isOverCompleted === true &&
      ball1_7.data.data.innings.overs === 1.0,
      'Ball 1.6 legal: Over 1 Completed (13/1 in 1.0 ov) -> Bowler slot cleared for next over'
    );

    // 6. Change Bowler & Consecutive Over Rule
    console.log('\n--- 6. Bowler Change & Consecutive Over Restriction ---');
    // Try to bowl Siraj again -> Should fail with 400 Bad Request
    const consecBowlerRes = await fetchJson(`${baseUrl}/scoring/${testMatchId}/bowler`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ bowlerId: pBowler1 }),
    });
    assert(
      consecBowlerRes.status === 400,
      'Consecutive over rule enforced (Bowler cannot bowl 2 consecutive overs)'
    );

    // Assign new bowler (Ferguson)
    const changeBowlerRes = await fetchJson(`${baseUrl}/scoring/${testMatchId}/bowler`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ bowlerId: pBowler2 }),
    });
    assert(changeBowlerRes.status === 200, 'New bowler assigned for Over 2');

    // 7. Undo Delivery & State Rollback
    console.log('\n--- 7. Delivery Undo & Exact State Rollback ---');
    // Bowl a ball in Over 2
    const ball2_1 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 4 }),
    });
    assert(ball2_1.data.data.innings.totalRuns === 17, 'Over 2 - Ball 1 recorded (17/1)');

    // Undo Ball 2.1
    const undoRes = await fetchJson(`${baseUrl}/scoring/${testMatchId}/undo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
    });
    assert(
      undoRes.status === 200 &&
      undoRes.data.data.innings.totalRuns === 13 &&
      undoRes.data.data.innings.overs === 1.0,
      'Undo delivery executed -> Exact total runs restored to 13, overs to 1.0'
    );

    // Bowl remaining balls of Over 2 to conclude 1st Innings (2 overs total)
    for (let b = 1; b <= 6; b++) {
      await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${scorerToken}` },
        body: JSON.stringify({ runsScored: 2 }),
      });
    }

    // Check scorecard after 1st innings
    const scorecard1 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/scorecard`);
    const inn1Data = scorecard1.data.data.innings[0];
    assert(
      inn1Data.isCompleted === true &&
      inn1Data.totalRuns === 25,
      `1st Innings concluded (Mumbai: 25/1 in 2.0 overs, CRR: ${inn1Data.currentRunRate})`
    );

    // 8. 2nd Innings Target Chase & Auto-Completion
    console.log('\n--- 8. 2nd Innings Target Chase & Match Auto-Finish ---');
    const startInn2 = await fetchJson(`${baseUrl}/scoring/${testMatchId}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        inningsNumber: 2,
        battingTeamId: blrTeam.id,
        bowlingTeamId: mumTeam.id,
        strikerId: blrSquad[0].playerId, // Virat
        nonStrikerId: blrSquad[1].playerId, // Faf
        bowlerId: mumSquad[7].playerId, // Bumrah
      }),
    });
    assert(
      startInn2.status === 200 &&
      startInn2.data.data.targetRuns === 26,
      '2nd Innings started with calculated target of 26 runs'
    );

    // Chase target: 4 sixes in first 4 balls = 24 runs + 1 two = 26 runs (Win!)
    await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, { method: 'POST', headers: { Authorization: `Bearer ${scorerToken}` }, body: JSON.stringify({ runsScored: 6 }) });
    await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, { method: 'POST', headers: { Authorization: `Bearer ${scorerToken}` }, body: JSON.stringify({ runsScored: 6 }) });
    await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, { method: 'POST', headers: { Authorization: `Bearer ${scorerToken}` }, body: JSON.stringify({ runsScored: 6 }) });
    await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, { method: 'POST', headers: { Authorization: `Bearer ${scorerToken}` }, body: JSON.stringify({ runsScored: 6 }) });
    const winningBall = await fetchJson(`${baseUrl}/scoring/${testMatchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 2 }),
    });

    assert(
      winningBall.status === 200 &&
      winningBall.data.data.innings.isCompleted === true,
      'Target reached -> 2nd Innings completed automatically'
    );

    // Verify Final Match Status & Result Summary
    const finalMatch = await fetchJson(`${baseUrl}/matches/${testMatchId}`);
    assert(
      finalMatch.status === 200 &&
      finalMatch.data.data.status === 'COMPLETED' &&
      finalMatch.data.data.winnerId === blrTeam.id &&
      finalMatch.data.data.winType === 'WICKETS' &&
      finalMatch.data.data.winMargin === 10,
      `Match concluded: Bangalore Titans won by 10 wickets! (${finalMatch.data.data.resultSummary})`
    );

    // 9. Scorecard Completeness & Commentary Feed
    console.log('\n--- 9. Full Scorecard Structure & Commentary Validation ---');
    const finalScorecard = await fetchJson(`${baseUrl}/scoring/${testMatchId}/scorecard`);
    const cardData = finalScorecard.data.data;

    assert(cardData.innings.length === 2, 'Scorecard contains both 1st and 2nd innings');
    assert(cardData.commentary.length >= 10, `Commentary feed operational (${cardData.commentary.length} events logged)`);
    assert(cardData.innings[0].batting.length >= 2, '1st Innings batting scorecard populated with strike rates');
    assert(cardData.innings[0].bowling.length >= 2, '1st Innings bowling figures populated with economy and overs');
    assert(cardData.innings[0].fallOfWickets.length === 1, 'Fall of wickets recorded with score and overs');

    console.log('\n====================================================');
    console.log(`🏁 PHASE 1 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase1Tests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
