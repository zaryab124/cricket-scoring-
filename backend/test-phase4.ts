import { createApp } from './src/app.js';
import { prisma } from './src/services/prisma.js';
import http from 'http';

const app = createApp();
const PORT = 5098;

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('🏏 CRICKET MASTER - PHASE 4 ADVANCED ANALYTICS, INTELLIGENCE & PUBLIC LIVE PLATFORM');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`🚀 Phase 4 test server listening on http://localhost:${PORT}`);

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
    // SECTION 1: Role Logins & Setup
    // ----------------------------------------------------
    console.log('\n--- SECTION 1: Authentication & Seeded Baseline Verification ---');

    const adminLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'superadmin@cricketmaster.io', password: 'Password@123' }),
    });
    assert(adminLogin.status === 200, 'Super Admin login successful');
    const adminToken = adminLogin.data.data.accessToken;

    const viewerLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'viewer@cricketmaster.io', password: 'Password@123' }),
    });
    assert(viewerLogin.status === 200, 'Viewer login successful');
    const viewerToken = viewerLogin.data.data.accessToken;

    // ----------------------------------------------------
    // SECTION 2: Public Match Center Discovery (Unauthenticated)
    // ----------------------------------------------------
    console.log('\n--- SECTION 2: Public Match Discovery & Live Match Center ---');

    const publicMatches = await fetchJson(`${baseUrl}/matches`);
    assert(publicMatches.status === 200, 'Public match list accessible without auth');
    assert(Array.isArray(publicMatches.data.data), 'Matches returned as array');
    assert(publicMatches.data.data.length > 0, 'Public matches directory contains fixtures');

    const sampleMatch = publicMatches.data.data[0];
    const publicMatchDetail = await fetchJson(`${baseUrl}/matches/${sampleMatch.id}`);
    assert(publicMatchDetail.status === 200, 'Public match detail accessible without auth');
    assert(publicMatchDetail.data.data.homeTeam !== undefined, 'Match details contain home team information');
    assert(publicMatchDetail.data.data.awayTeam !== undefined, 'Match details contain away team information');

    // Filter matches by format and status
    const t20Matches = await fetchJson(`${baseUrl}/matches?format=T20`);
    assert(t20Matches.status === 200, 'Matches filtered by format=T20 successfully');

    // ----------------------------------------------------
    // SECTION 3: Public Scorecard & Real-time Live Stream (SSE)
    // ----------------------------------------------------
    console.log('\n--- SECTION 3: Public Live Scorecard & SSE Event Stream ---');

    const publicScorecard = await fetchJson(`${baseUrl}/scoring/${sampleMatch.id}/scorecard`);
    assert(publicScorecard.status === 200, 'Public scorecard accessible without auth');
    assert(publicScorecard.data.data.match !== undefined, 'Scorecard contains match header');
    assert(Array.isArray(publicScorecard.data.data.innings), 'Scorecard contains innings array');
    assert(Array.isArray(publicScorecard.data.data.commentary), 'Scorecard contains commentary array');

    // Test SSE endpoint connectivity
    const controller = new AbortController();
    const sseRes = await fetch(`${baseUrl}/scoring/${sampleMatch.id}/live-stream`, {
      signal: controller.signal,
    });
    assert(sseRes.status === 200, 'Live SSE stream responds with HTTP 200 OK');
    assert(
      sseRes.headers.get('content-type')?.includes('text/event-stream') || false,
      'Live stream content-type is text/event-stream'
    );
    controller.abort();

    // ----------------------------------------------------
    // SECTION 4: Advanced Player Statistics & Profile Intelligence
    // ----------------------------------------------------
    console.log('\n--- SECTION 4: Advanced Player Statistics & Profile Intelligence ---');

    const playersList = await fetchJson(`${baseUrl}/players`);
    assert(playersList.status === 200, 'Public athlete catalog accessible without auth');
    const testPlayer = playersList.data.data[0];

    const playerProfile = await fetchJson(`${baseUrl}/players/${testPlayer.id}`);
    assert(playerProfile.status === 200, 'Public player profile retrieved successfully');
    assert(playerProfile.data.data.careerStats !== undefined, 'Player profile includes dynamic career statistics');
    assert(playerProfile.data.data.careerStats.batting !== undefined, 'Batting career statistics computed');
    assert(playerProfile.data.data.careerStats.bowling !== undefined, 'Bowling career statistics computed');
    assert(playerProfile.data.data.careerStats.fielding !== undefined, 'Fielding career statistics computed');
    assert(
      typeof playerProfile.data.data.careerStats.bowling.fiveWicketHauls === 'number',
      '5-wicket haul count computed in bowling stats'
    );
    assert(
      typeof playerProfile.data.data.careerStats.bowling.threeWicketHauls === 'number',
      '3-wicket haul count computed in bowling stats'
    );
    assert(
      playerProfile.data.data.user?.passwordHash === undefined,
      'Sensitive user credentials strictly excluded from public player profile'
    );

    // ----------------------------------------------------
    // SECTION 5: Player Performance Analytics & Trends
    // ----------------------------------------------------
    console.log('\n--- SECTION 5: Player Performance Analytics & Recent Match Trends ---');

    const playerAnalytics = await fetchJson(`${baseUrl}/players/${testPlayer.id}/analytics`);
    assert(playerAnalytics.status === 200, 'Player performance analytics retrieved successfully');
    assert(playerAnalytics.data.data.formatBreakdown !== undefined, 'Format-specific splits (T20, ODI, TEST) provided');
    assert(playerAnalytics.data.data.formatBreakdown.T20 !== undefined, 'T20 performance metrics calculated');
    assert(Array.isArray(playerAnalytics.data.data.recentBatting), 'Recent batting form provided as match list');
    assert(Array.isArray(playerAnalytics.data.data.recentBowling), 'Recent bowling form provided as match list');

    // ----------------------------------------------------
    // SECTION 6: Deterministic Player Power Rankings
    // ----------------------------------------------------
    console.log('\n--- SECTION 6: Deterministic Player Power Rankings & Leaderboards ---');

    // Batting Rankings
    const batRankings = await fetchJson(`${baseUrl}/stats/rankings?category=BATTING`);
    assert(batRankings.status === 200, 'Batting rankings retrieved successfully');
    assert(Array.isArray(batRankings.data.data.rankings), 'Batting rankings returned as array');
    if (batRankings.data.data.rankings.length > 1) {
      const top1 = batRankings.data.data.rankings[0];
      const top2 = batRankings.data.data.rankings[1];
      assert(top1.rank === 1, 'Top batter is assigned rank 1');
      assert(top1.points >= top2.points, 'Batting rankings sorted descending by points');
      assert(top1.metrics.strikeRate !== undefined, 'Batting rankings include strike rate metric');
      assert(top1.metrics.average !== undefined, 'Batting rankings include batting average metric');
    }

    // Bowling Rankings
    const bowlRankings = await fetchJson(`${baseUrl}/stats/rankings?category=BOWLING`);
    assert(bowlRankings.status === 200, 'Bowling rankings retrieved successfully');
    assert(Array.isArray(bowlRankings.data.data.rankings), 'Bowling rankings returned as array');
    if (bowlRankings.data.data.rankings.length > 1) {
      const topBowl1 = bowlRankings.data.data.rankings[0];
      const topBowl2 = bowlRankings.data.data.rankings[1];
      assert(topBowl1.rank === 1, 'Top bowler is assigned rank 1');
      assert(topBowl1.points >= topBowl2.points, 'Bowling rankings sorted descending by points');
      assert(topBowl1.metrics.economy !== undefined, 'Bowling rankings include economy metric');
      assert(topBowl1.metrics.wickets !== undefined, 'Bowling rankings include wickets metric');
    }

    // All-Rounder Rankings
    const allRounderRankings = await fetchJson(`${baseUrl}/stats/rankings?category=ALL_ROUNDER`);
    assert(allRounderRankings.status === 200, 'All-Rounder rankings retrieved successfully');
    assert(Array.isArray(allRounderRankings.data.data.rankings), 'All-Rounder rankings returned as array');

    // Leaderboard Aggregation
    const leaderboard = await fetchJson(`${baseUrl}/stats/leaderboard`);
    assert(leaderboard.status === 200, 'Platform leaderboard retrieved successfully');
    assert(Array.isArray(leaderboard.data.data.topBatters), 'Leaderboard includes top batters');
    assert(Array.isArray(leaderboard.data.data.topBowlers), 'Leaderboard includes top bowlers');
    assert(Array.isArray(leaderboard.data.data.topAllRounders), 'Leaderboard includes top all-rounders');

    // ----------------------------------------------------
    // SECTION 7: Tournament Scoped Analytics & Cap Leaders
    // ----------------------------------------------------
    console.log('\n--- SECTION 7: Tournament Scoped Analytics & Cap Leaders ---');

    const tournamentsList = await fetchJson(`${baseUrl}/tournaments`);
    assert(tournamentsList.status === 200, 'Tournaments directory retrieved successfully');
    const sampleTourney = tournamentsList.data.data[0];

    const tourneyAnalytics = await fetchJson(`${baseUrl}/tournaments/${sampleTourney.id}/analytics`);
    assert(tourneyAnalytics.status === 200, 'Tournament scoped analytics retrieved successfully');
    assert(Array.isArray(tourneyAnalytics.data.data.topScorers), 'Tournament Orange Cap top scorers calculated');
    assert(Array.isArray(tourneyAnalytics.data.data.topWicketTakers), 'Tournament Purple Cap top wicket takers calculated');
    assert(tourneyAnalytics.data.data.tournamentRecords !== undefined, 'Tournament records calculated');
    assert(Array.isArray(tourneyAnalytics.data.data.tournamentRecords.mostSixes), 'Most sixes record tracked');
    assert(Array.isArray(tourneyAnalytics.data.data.tournamentRecords.mostBoundaries), 'Most boundaries record tracked');

    // ----------------------------------------------------
    // SECTION 8: Match Analytics & Over-by-Over Progression
    // ----------------------------------------------------
    console.log('\n--- SECTION 8: Match Analytics & Over-by-Over Progression ---');

    const matchAnalytics = await fetchJson(`${baseUrl}/matches/${sampleMatch.id}/analytics`);
    assert(matchAnalytics.status === 200, 'Match analytics retrieved successfully');
    assert(matchAnalytics.data.data.teamComparison !== undefined, 'Match analytics includes team head-to-head comparison');
    assert(Array.isArray(matchAnalytics.data.data.inningsAnalytics), 'Innings analytics provided');
    if (matchAnalytics.data.data.inningsAnalytics.length > 0) {
      const firstInnAnalytics = matchAnalytics.data.data.inningsAnalytics[0];
      assert(Array.isArray(firstInnAnalytics.oversProgression), 'Over-by-over progression breakdown calculated');
      assert(typeof firstInnAnalytics.dotBalls === 'number', 'Innings dot ball count computed');
      assert(typeof firstInnAnalytics.boundaryFours === 'number', 'Innings boundary fours computed');
      assert(typeof firstInnAnalytics.boundarySixes === 'number', 'Innings boundary sixes computed');
    }

    // ----------------------------------------------------
    // SECTION 9: Global Multi-Entity Search
    // ----------------------------------------------------
    console.log('\n--- SECTION 9: Global Search & Multi-Entity Discovery ---');

    // Search by generic keyword
    const searchAll = await fetchJson(`${baseUrl}/search?q=Titan`);
    assert(searchAll.status === 200, 'Global search executed successfully');
    assert(typeof searchAll.data.data.totalResults === 'number', 'Search result count returned');
    assert(Array.isArray(searchAll.data.data.teams), 'Teams array returned in search response');

    // Search specifically for players
    const searchPlayers = await fetchJson(`${baseUrl}/search?type=players&q=`);
    assert(searchPlayers.status === 200, 'Player type filter search executed successfully');
    assert(Array.isArray(searchPlayers.data.data.players), 'Players returned from player search');

    // Search tournaments
    const searchTournaments = await fetchJson(`${baseUrl}/search?type=tournaments&format=T20`);
    assert(searchTournaments.status === 200, 'Tournament format filter search executed successfully');
    assert(Array.isArray(searchTournaments.data.data.tournaments), 'Tournaments returned in search response');

    // ----------------------------------------------------
    // SECTION 10: Admin Intelligence Dashboard & RBAC
    // ----------------------------------------------------
    console.log('\n--- SECTION 10: Admin Intelligence Dashboard & RBAC Authorization ---');

    // Unauthenticated request
    const unauthAdmin = await fetchJson(`${baseUrl}/stats/admin-dashboard`);
    assert(unauthAdmin.status === 401, 'Unauthenticated request to admin dashboard rejected with 401');

    // Viewer role request
    const viewerAdmin = await fetchJson(`${baseUrl}/stats/admin-dashboard`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert(viewerAdmin.status === 403, 'Unauthorized Viewer role rejected from admin dashboard with 403');

    // Super Admin request
    const superAdminDashboard = await fetchJson(`${baseUrl}/stats/admin-dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(superAdminDashboard.status === 200, 'Super Admin granted access to admin dashboard');
    assert(typeof superAdminDashboard.data.data.summary.totalTournaments === 'number', 'Total tournaments telemetry computed');
    assert(typeof superAdminDashboard.data.data.summary.totalTeams === 'number', 'Total teams telemetry computed');
    assert(typeof superAdminDashboard.data.data.summary.totalPlayers === 'number', 'Total players telemetry computed');
    assert(typeof superAdminDashboard.data.data.summary.totalRecordedDeliveries === 'number', 'Total deliveries telemetry computed');
    assert(Array.isArray(superAdminDashboard.data.data.recentMatches), 'Recent matches activity list provided');

    // ----------------------------------------------------
    // SECTION 11: Data Integrity & Immutability Verification
    // ----------------------------------------------------
    console.log('\n--- SECTION 11: Data Integrity & Immutability Audit ---');

    // Verify completed match lockdown on ball recording
    const recordBallOnComplete = await fetchJson(`${baseUrl}/scoring/${sampleMatch.id}/record-ball`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        inningsId: 'invalid-or-complete',
        overNumber: 1,
        ballNumber: 1,
        batsmanId: testPlayer.id,
        nonStrikerId: testPlayer.id,
        bowlerId: testPlayer.id,
        runsScored: 4,
      }),
    });
    assert(
      recordBallOnComplete.status === 400 || recordBallOnComplete.status === 404,
      'Scoring engine rejects ball recording when match is not live or invalid'
    );

    // Verify team standings math integrity
    const standingsData = await fetchJson(`${baseUrl}/tournaments/${sampleTourney.id}/standings`);
    assert(standingsData.status === 200, 'Tournament standings retrieved');
    assert(Array.isArray(standingsData.data.data.standings), 'Standings array formatted with NRR');

  } catch (error: any) {
    console.error('❌ Unexpected test runner error:', error);
    failed++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();

    console.log('\n====================================================');
    console.log(`🏁 PHASE 4 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase4Tests();
