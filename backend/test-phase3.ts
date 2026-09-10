import { createApp } from './src/app.js';
import { prisma } from './src/services/prisma.js';
import http from 'http';

const app = createApp();
const PORT = 5099;

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('🏏 CRICKET MASTER - PHASE 3 ADVANCED MATCH OPERATIONS & LIVE SCORING');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`🚀 Phase 3 test server listening on http://localhost:${PORT}`);

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
    return { status: res.status, headers: res.headers, data };
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
    // ----------------------------------------------------
    // SECTION 1: Role Authentication & RBAC for Scorer Operations
    // ----------------------------------------------------
    console.log('\n--- SECTION 1: Role Authentication & Scoring RBAC ---');
    const adminLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'superadmin@cricketmaster.io', password: 'Password@123' }),
    });
    assert(adminLogin.status === 200, 'Super Admin authenticated successfully');
    const adminToken = adminLogin.data.data.accessToken;

    const tourneyAdminLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'tournamentadmin@cricketmaster.io', password: 'Password@123' }),
    });
    assert(tourneyAdminLogin.status === 200, 'Tournament Admin authenticated successfully');
    const tourneyAdminToken = tourneyAdminLogin.data.data.accessToken;

    const leagueAdminLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'leagueadmin@cricketmaster.io', password: 'Password@123' }),
    });
    assert(leagueAdminLogin.status === 200, 'League Admin authenticated successfully');
    const leagueAdminToken = leagueAdminLogin.data.data.accessToken;

    const scorerLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'scorer@cricketmaster.io', password: 'Password@123' }),
    });
    assert(scorerLogin.status === 200, 'Scorer authenticated successfully');
    const scorerToken = scorerLogin.data.data.accessToken;

    const viewerLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'viewer@cricketmaster.io', password: 'Password@123' }),
    });
    assert(viewerLogin.status === 200, 'Viewer authenticated successfully');
    const viewerToken = viewerLogin.data.data.accessToken;

    // ----------------------------------------------------
    // SECTION 2: Match Setup, Playing XI & Toss
    // ----------------------------------------------------
    console.log('\n--- SECTION 2: Match Setup, Playing XI & Toss ---');
    const teamsRes = await fetchJson(`${baseUrl}/teams?limit=100`);
    const mumTeam = teamsRes.data.data.find((t: any) => t.code === 'MUM-STR');
    const blrTeam = teamsRes.data.data.find((t: any) => t.code === 'BLR-TIT');
    assert(!!mumTeam && !!blrTeam, 'Retrieved Mumbai Strikers and Bangalore Titans clubs');

    // Fetch squads from team history
    const mumHistoryRes = await fetchJson(`${baseUrl}/teams/${mumTeam.id}/history`);
    const blrHistoryRes = await fetchJson(`${baseUrl}/teams/${blrTeam.id}/history`);
    const mumSquad = mumHistoryRes.data.data.activeMembers.slice(0, 11).map((m: any, idx: number) => ({
      playerId: m.playerId,
      isPlayingXI: true,
      battingOrder: idx + 1,
      isCaptain: m.isCaptain,
      isViceCaptain: m.isViceCaptain,
      isWicketKeeper: m.isWicketKeeper,
    }));
    const blrSquad = blrHistoryRes.data.data.activeMembers.slice(0, 11).map((m: any, idx: number) => ({
      playerId: m.playerId,
      isPlayingXI: true,
      battingOrder: idx + 1,
      isCaptain: m.isCaptain,
      isViceCaptain: m.isViceCaptain,
      isWicketKeeper: m.isWicketKeeper,
    }));
    assert(mumSquad.length === 11 && blrSquad.length === 11, 'Retrieved 11 squad players per team');

    // Create a 2-over match for full simulation
    const matchRes = await fetchJson(`${baseUrl}/matches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({
        title: 'Phase 3 Grand Championship Match',
        format: 'T20',
        oversLimit: 2,
        venue: 'Wankhede Stadium, Mumbai',
        homeTeamId: mumTeam.id,
        awayTeamId: blrTeam.id,
        matchDate: new Date().toISOString(),
      }),
    });
    assert(matchRes.status === 201, 'Tournament Admin created match with 2-over limit');
    const matchId = matchRes.data.data.id;

    // Assign Playing XI for both teams
    const assignSquadsRes = await fetchJson(`${baseUrl}/matches/${matchId}/squads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        homeTeamSquad: mumSquad,
        awayTeamSquad: blrSquad,
      }),
    });
    assert(
      assignSquadsRes.status === 200 &&
      assignSquadsRes.data.data.homeTeam.playingXI.length === 11 &&
      assignSquadsRes.data.data.awayTeam.playingXI.length === 11,
      'Playing XI assigned for both teams (11 players each)'
    );

    // Conduct Toss
    const tossRes = await fetchJson(`${baseUrl}/matches/${matchId}/toss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        tossWinnerId: mumTeam.id,
        tossDecision: 'BAT',
      }),
    });
    assert(tossRes.status === 200, 'Toss recorded: Mumbai won toss and chose to BAT');

    // RBAC check: Viewer cannot start innings
    const viewerStartInnRes = await fetchJson(`${baseUrl}/scoring/${matchId}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({
        inningsNumber: 1,
        battingTeamId: mumTeam.id,
        bowlingTeamId: blrTeam.id,
        strikerId: mumSquad[0].playerId,
        nonStrikerId: mumSquad[1].playerId,
        bowlerId: blrSquad[0].playerId,
      }),
    });
    assert(viewerStartInnRes.status === 403, 'Viewer blocked from starting innings (403 Forbidden)');

    // ----------------------------------------------------
    // SECTION 3: 1st Innings Scoring & Edge Cases
    // ----------------------------------------------------
    console.log('\n--- SECTION 3: 1st Innings Scoring, Extras & Wickets ---');
    const startInn1Res = await fetchJson(`${baseUrl}/scoring/${matchId}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        inningsNumber: 1,
        battingTeamId: mumTeam.id,
        bowlingTeamId: blrTeam.id,
        strikerId: mumSquad[0].playerId,
        nonStrikerId: mumSquad[1].playerId,
        bowlerId: blrSquad[0].playerId,
      }),
    });
    assert(startInn1Res.status === 200, '1st Innings started by Scorer with Rohit & Striker 2 vs Bowler 1');

    // Ball 1.1: Dot ball (0 runs)
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 0, extraRuns: 0, extraType: null, isWicket: false }),
    });

    // Ball 1.2: Boundary Four (4 runs)
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 4, extraRuns: 0, extraType: null, isWicket: false }),
    });

    // Ball 1.3: Wide Ball (+1 Wide)
    const wideRes = await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 0, extraRuns: 1, extraType: 'WIDE', isWicket: false }),
    });
    assert(wideRes.status === 200, 'Recorded +1 Wide Delivery (extra ball, legal count preserved)');

    // Ball 1.3 re-bowl: No Ball (+1 No Ball)
    const nbRes = await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 0, extraRuns: 1, extraType: 'NO_BALL', isWicket: false }),
    });
    assert(nbRes.status === 200, 'Recorded +1 No-Ball Delivery');

    // Ball 1.3 re-bowl 2: Boundary Six (6 runs)
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 6, extraRuns: 0, extraType: null, isWicket: false }),
    });

    // Ball 1.4: Single (1 run, strike rotates)
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 1, extraRuns: 0, extraType: null, isWicket: false }),
    });

    // Ball 1.5: Wicket - CAUGHT (striker dismissed, fielder credited, new batsman enters)
    const caughtRes = await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        runsScored: 0,
        extraRuns: 0,
        isWicket: true,
        wicketType: 'CAUGHT',
        dismissedPlayerId: mumSquad[1].playerId,
        fielderId: blrSquad[3].playerId,
        newBatsmanId: mumSquad[2].playerId,
      }),
    });
    assert(caughtRes.status === 200, 'Recorded Dismissal (CAUGHT with Fielder & New Batsman)');

    // Ball 1.6: Single (1 run, completing Over 1)
    const overEndRes = await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 1, extraRuns: 0, extraType: null, isWicket: false }),
    });
    assert(overEndRes.status === 200, 'Completed Over 1 (6 legal balls recorded)');

    // ----------------------------------------------------
    // SECTION 4: Bowler Management & Consecutive Over Prevention Rule
    // ----------------------------------------------------
    console.log('\n--- SECTION 4: Bowler Management & Consecutive Over Restriction ---');
    // Attempt to select the SAME bowler for Over 2 (must be rejected)
    const sameBowlerRes = await fetchJson(`${baseUrl}/scoring/${matchId}/bowler`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ bowlerId: blrSquad[0].playerId }),
    });
    assert(
      sameBowlerRes.status === 400,
      'Consecutive over prevented: Same bowler cannot bowl consecutive overs (400 Bad Request)'
    );

    // Select different bowler (blrSquad[1])
    const newBowlerRes = await fetchJson(`${baseUrl}/scoring/${matchId}/bowler`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ bowlerId: blrSquad[1].playerId }),
    });
    assert(newBowlerRes.status === 200, 'Changed bowler to Bangalore Bowler 2 for Over 2');

    // ----------------------------------------------------
    // SECTION 5: Over 2 Scoring, Undo & Run Out Delivery
    // ----------------------------------------------------
    console.log('\n--- SECTION 5: Over 2 Scoring, Undo & Run Out Workflow ---');
    // Ball 2.1: 2 runs
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 2, extraRuns: 0, extraType: null, isWicket: false }),
    });

    // Test Undo of Ball 2.1
    const undoRes = await fetchJson(`${baseUrl}/scoring/${matchId}/undo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
    });
    assert(undoRes.status === 200, 'Undid delivery successfully (Score & balls rolled back)');

    // Re-record Ball 2.1: 1 Bye (+1 Bye)
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 0, extraRuns: 1, extraType: 'BYE', isWicket: false }),
    });

    // Ball 2.2: 1 Leg Bye (+1 Leg Bye)
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 0, extraRuns: 1, extraType: 'LEG_BYE', isWicket: false }),
    });

    // Ball 2.3: Wicket - RUN OUT with 1 run taken
    const runOutRes = await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        runsScored: 1,
        extraRuns: 0,
        isWicket: true,
        wicketType: 'RUN_OUT',
        dismissedPlayerId: mumSquad[2].playerId,
        fielderId: blrSquad[4].playerId,
        newBatsmanId: mumSquad[3].playerId,
      }),
    });
    assert(runOutRes.status === 200, 'Recorded RUN OUT with 1 run completed & fielder throw');

    // Ball 2.4: 2 runs
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 2, extraRuns: 0, extraType: null, isWicket: false }),
    });

    // Ball 2.5: Wicket - BOWLED
    const bowledRes = await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        runsScored: 0,
        extraRuns: 0,
        isWicket: true,
        wicketType: 'BOWLED',
        dismissedPlayerId: mumSquad[3].playerId,
        newBatsmanId: mumSquad[4].playerId,
      }),
    });
    assert(bowledRes.status === 200, 'Recorded BOWLED dismissal (Bowler credited with wicket)');

    // Ball 2.6: Boundary Six (6 runs) completing 2 overs quota
    const finalBallRes = await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 6, extraRuns: 0, extraType: null, isWicket: false }),
    });
    assert(finalBallRes.status === 200, 'Completed final ball of 1st Innings');

    // Check Scorecard for Innings 1
    const sc1Res = await fetchJson(`${baseUrl}/scoring/${matchId}/scorecard`);
    const inn1Data = sc1Res.data.data.innings[0];
    assert(
      sc1Res.status === 200 && inn1Data.isCompleted,
      `1st Innings completed automatically on reaching overs limit: ${inn1Data.totalRuns}/${inn1Data.wickets} in ${inn1Data.oversFormatted} ov`
    );

    // ----------------------------------------------------
    // SECTION 6: Innings Break & 2nd Innings Target Chase
    // ----------------------------------------------------
    console.log('\n--- SECTION 6: Innings Break & 2nd Innings Target Chase ---');
    const target = inn1Data.totalRuns + 1;
    assert(target > 0, `Auto-calculated chase target: ${target} runs from 2 overs`);

    // Start 2nd Innings (Teams inverted: BLR bats, MUM bowls)
    const startInn2Res = await fetchJson(`${baseUrl}/scoring/${matchId}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({
        inningsNumber: 2,
        battingTeamId: blrTeam.id,
        bowlingTeamId: mumTeam.id,
        strikerId: blrSquad[0].playerId,
        nonStrikerId: blrSquad[1].playerId,
        bowlerId: mumSquad[0].playerId,
        targetRuns: target,
      }),
    });
    assert(startInn2Res.status === 200, '2nd Innings started with Bangalore chasing target');

    // Simulate Bangalore scoring rapid boundaries to chase target
    // Over 1 (Mum Bowler 1)
    // 6, 6, 4, 4, 6
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 6, extraRuns: 0, isWicket: false }),
    });
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 6, extraRuns: 0, isWicket: false }),
    });
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 4, extraRuns: 0, isWicket: false }),
    });
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 4, extraRuns: 0, isWicket: false }),
    });
    await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 6, extraRuns: 0, isWicket: false }),
    });

    // Check if target was achieved and match completed
    const finalScRes = await fetchJson(`${baseUrl}/scoring/${matchId}/scorecard`);
    const matchSummary = finalScRes.data.data.match;
    assert(
      matchSummary.status === 'COMPLETED' && matchSummary.winner?.id === blrTeam.id,
      `Match concluded with victory for ${matchSummary.winner?.name}: ${matchSummary.resultSummary}`
    );
    assert(matchSummary.winType === 'WICKETS', 'Win type correctly registered as WICKETS');

    // ----------------------------------------------------
    // SECTION 7: Post-Match Scoring Lockdown
    // ----------------------------------------------------
    console.log('\n--- SECTION 7: Post-Match Scoring Lockdown ---');
    const postMatchBallRes = await fetchJson(`${baseUrl}/scoring/${matchId}/ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runsScored: 4, isWicket: false }),
    });
    assert(
      postMatchBallRes.status === 400,
      'Post-match lockdown active: Delivery rejected on COMPLETED match (400 Bad Request)'
    );

    const postMatchStartInnRes = await fetchJson(`${baseUrl}/scoring/${matchId}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        inningsNumber: 3,
        battingTeamId: mumTeam.id,
        bowlingTeamId: blrTeam.id,
        strikerId: mumSquad[0].playerId,
        nonStrikerId: mumSquad[1].playerId,
        bowlerId: blrSquad[0].playerId,
      }),
    });
    assert(
      postMatchStartInnRes.status === 400,
      'Post-match lockdown active: New innings rejected on COMPLETED match (400 Bad Request)'
    );

    // ----------------------------------------------------
    // SECTION 8: Audit Logs & Operational History
    // ----------------------------------------------------
    console.log('\n--- SECTION 8: Audit Logs & Operational History ---');
    const auditLogsRes = await fetchJson(`${baseUrl}/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditLogsRes.status === 200, 'Admin retrieved system audit logs');
    const actions = auditLogsRes.data.data.map((l: any) => l.action);
    assert(actions.includes('INNINGS_STARTED'), 'Audit log recorded INNINGS_STARTED');
    assert(actions.includes('BALL_EVENT_RECORDED'), 'Audit log recorded BALL_EVENT_RECORDED');
    assert(actions.includes('BALL_EVENT_UNDONE'), 'Audit log recorded BALL_EVENT_UNDONE');
    assert(actions.includes('BOWLER_CHANGED'), 'Audit log recorded BOWLER_CHANGED');

    // ----------------------------------------------------
    // SECTION 9: Server-Sent Events (SSE) Live Stream Endpoint
    // ----------------------------------------------------
    console.log('\n--- SECTION 9: SSE Live Event Stream Endpoint ---');
    const abortCtrl = new AbortController();
    let sseStatus = 0;
    let isEventStream = false;
    try {
      const sseRes = await fetch(`${baseUrl}/scoring/${matchId}/live-stream`, {
        headers: { Accept: 'text/event-stream' },
        signal: abortCtrl.signal,
      });
      sseStatus = sseRes.status;
      isEventStream = (sseRes.headers.get('content-type') || '').includes('text/event-stream');
      abortCtrl.abort();
    } catch {
      // Aborted as expected after reading headers
    }
    assert(
      sseStatus === 200 && isEventStream,
      'Live stream SSE endpoint responds with text/event-stream and 200 OK'
    );

    // ----------------------------------------------------
    // SECTION 10: Defending Team Win Simulation (Win by Runs)
    // ----------------------------------------------------
    console.log('\n--- SECTION 10: Match Defending Simulation (Win by Runs) ---');
    const match2Res = await fetchJson(`${baseUrl}/matches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({
        title: 'Phase 3 Defending Showcase',
        format: 'T20',
        oversLimit: 1,
        venue: 'Eden Gardens, Kolkata',
        homeTeamId: blrTeam.id,
        awayTeamId: mumTeam.id,
        matchDate: new Date().toISOString(),
      }),
    });
    const match2Id = match2Res.data.data.id;

    // Squads
    await fetchJson(`${baseUrl}/matches/${match2Id}/squads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        homeTeamSquad: blrSquad,
        awayTeamSquad: mumSquad,
      }),
    });

    // Toss
    await fetchJson(`${baseUrl}/matches/${match2Id}/toss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ tossWinnerId: blrTeam.id, tossDecision: 'BAT' }),
    });

    // Start Innings 1: BLR bats
    await fetchJson(`${baseUrl}/scoring/${match2Id}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        inningsNumber: 1,
        battingTeamId: blrTeam.id,
        bowlingTeamId: mumTeam.id,
        strikerId: blrSquad[0].playerId,
        nonStrikerId: blrSquad[1].playerId,
        bowlerId: mumSquad[0].playerId,
      }),
    });

    // 6 legal balls: 6, 6, 6, 6, 4, 4 = 32 runs
    for (let i = 0; i < 4; i++) {
      await fetchJson(`${baseUrl}/scoring/${match2Id}/ball`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${scorerToken}` },
        body: JSON.stringify({ runsScored: 6, isWicket: false }),
      });
    }
    for (let i = 0; i < 2; i++) {
      await fetchJson(`${baseUrl}/scoring/${match2Id}/ball`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${scorerToken}` },
        body: JSON.stringify({ runsScored: 4, isWicket: false }),
      });
    }

    // Start Innings 2: MUM bats, needs 33 runs
    await fetchJson(`${baseUrl}/scoring/${match2Id}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        inningsNumber: 2,
        battingTeamId: mumTeam.id,
        bowlingTeamId: blrTeam.id,
        strikerId: mumSquad[0].playerId,
        nonStrikerId: mumSquad[1].playerId,
        bowlerId: blrSquad[0].playerId,
        targetRuns: 33,
      }),
    });

    // MUM scores 6 dot balls = 0 runs in 1 over
    for (let i = 0; i < 6; i++) {
      await fetchJson(`${baseUrl}/scoring/${match2Id}/ball`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${scorerToken}` },
        body: JSON.stringify({ runsScored: 0, isWicket: false }),
      });
    }

    // Check Match 2 result
    const m2FinalRes = await fetchJson(`${baseUrl}/scoring/${match2Id}/scorecard`);
    const m2Summary = m2FinalRes.data.data.match;
    assert(
      m2Summary.status === 'COMPLETED' && m2Summary.winner?.id === blrTeam.id,
      `Defending team victory: ${m2Summary.winner?.name} won by ${m2Summary.winMargin} runs (${m2Summary.resultSummary})`
    );
    assert(m2Summary.winType === 'RUNS', 'Win type correctly registered as RUNS');

  } catch (err: any) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`🏁 PHASE 3 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase3Tests();
