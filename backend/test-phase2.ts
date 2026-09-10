import { createApp } from './src/app.js';
import { prisma } from './src/services/prisma.js';
import http from 'http';

const app = createApp();
const PORT = 5098;

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🏆 CRICKET MASTER - PHASE 2 PLATFORM TESTS');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`🚀 Phase 2 test server listening on http://localhost:${PORT}`);

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
    // 1. Authenticate Roles
    console.log('\n--- SECTION 1: Role Authentication & RBAC ---');
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

    const viewerLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'viewer@cricketmaster.io', password: 'Password@123' }),
    });
    assert(viewerLogin.status === 200, 'Viewer authenticated successfully');
    const viewerToken = viewerLogin.data.data.accessToken;

    // 2. Tournament Creation, Update & Status Transitions
    console.log('\n--- SECTION 2: Tournament Management Lifecycle ---');
    const compCode = `P2T-${Date.now()}`;
    const createCompRes = await fetchJson(`${baseUrl}/tournaments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({
        name: 'Champions Premier Trophy 2026',
        code: compCode,
        type: 'TOURNAMENT',
        format: 'T20',
        seasonYear: 2026,
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-11-15T00:00:00.000Z',
      }),
    });

    assert(createCompRes.status === 201, 'Tournament Admin created new tournament');
    const tournamentId = createCompRes.data.data.id;
    assert(createCompRes.data.data.status === 'UPCOMING', 'Tournament created with UPCOMING status');

    // RBAC: Viewer cannot update tournament
    const viewerUpdateRes = await fetchJson(`${baseUrl}/tournaments/${tournamentId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({ name: 'Hacked Tournament' }),
    });
    assert(viewerUpdateRes.status === 403, 'Viewer blocked from updating tournament (403 Forbidden)');

    // Admin updates tournament details
    const updateCompRes = await fetchJson(`${baseUrl}/tournaments/${tournamentId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Champions Premier Trophy 2026 (Official)',
        type: 'LEAGUE',
      }),
    });
    assert(updateCompRes.status === 200 && updateCompRes.data.data.name.includes('(Official)'), 'Admin updated tournament metadata');

    // Update status to ONGOING
    const statusUpdateRes = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({ status: 'ONGOING' }),
    });
    assert(statusUpdateRes.status === 200 && statusUpdateRes.data.data.status === 'ONGOING', 'Tournament status transitioned to ONGOING');

    // 3. Participating Teams Roster Management
    console.log('\n--- SECTION 3: Tournament Participating Teams Roster ---');
    // Create 4 dedicated teams for clean tournament standings calculation
    const teamAlpha = await prisma.team.create({
      data: { name: `Alpha Lions ${Date.now()}`, shortName: 'ALN', code: `ALN${Date.now().toString().slice(-4)}` },
    });
    const teamBeta = await prisma.team.create({
      data: { name: `Beta Strikers ${Date.now()}`, shortName: 'BST', code: `BST${Date.now().toString().slice(-4)}` },
    });
    const teamGamma = await prisma.team.create({
      data: { name: `Gamma Kings ${Date.now()}`, shortName: 'GKG', code: `GKG${Date.now().toString().slice(-4)}` },
    });
    const teamDelta = await prisma.team.create({
      data: { name: `Delta Royals ${Date.now()}`, shortName: 'DRY', code: `DRY${Date.now().toString().slice(-4)}` },
    });

    // Enroll 4 teams into tournament
    const addTeam1 = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({ teamId: teamAlpha.id, groupName: 'Group A', seed: 1 }),
    });
    const addTeam2 = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({ teamId: teamBeta.id, groupName: 'Group A', seed: 2 }),
    });
    const addTeam3 = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({ teamId: teamGamma.id, groupName: 'Group A', seed: 3 }),
    });
    const addTeam4 = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tourneyAdminToken}` },
      body: JSON.stringify({ teamId: teamDelta.id, groupName: 'Group A', seed: 4 }),
    });

    assert(addTeam1.status === 201 && addTeam2.status === 201 && addTeam3.status === 201 && addTeam4.status === 201, 'Enrolled 4 franchises into tournament');

    // Query enrolled teams
    const enrolledTeamsRes = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/teams`);
    assert(enrolledTeamsRes.status === 200 && enrolledTeamsRes.data.data.length === 4, 'Retrieved list of 4 participating franchises');

    // Test removing and re-enrolling a team
    const removeTeamRes = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/teams/${teamDelta.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(removeTeamRes.status === 200, 'Admin successfully removed team from tournament');

    const reAddTeamRes = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ teamId: teamDelta.id, groupName: 'Group A', seed: 4 }),
    });
    assert(reAddTeamRes.status === 201, 'Re-enrolled team back into tournament');

    // 4. Tournament Standings & Points Table with NRR
    console.log('\n--- SECTION 4: Tournament Standings & Net Run Rate (NRR) ---');
    // Match 1: Alpha vs Beta (Alpha: 160/4 in 20.0 ov, Beta: 140/8 in 20.0 ov -> Alpha wins by 20 runs)
    const match1 = await prisma.match.create({
      data: {
        competitionId: tournamentId,
        format: 'T20',
        oversLimit: 20,
        venue: 'Grand Oval',
        matchDate: new Date(),
        homeTeamId: teamAlpha.id,
        awayTeamId: teamBeta.id,
        status: 'COMPLETED',
        winnerId: teamAlpha.id,
        winMargin: 20,
        winType: 'RUNS',
        resultSummary: `${teamAlpha.name} won by 20 runs`,
      },
    });
    // Alpha innings (160 runs, 120 legal balls)
    await prisma.innings.create({
      data: {
        matchId: match1.id,
        inningsNumber: 1,
        battingTeamId: teamAlpha.id,
        bowlingTeamId: teamBeta.id,
        totalRuns: 160,
        wickets: 4,
        overs: 20.0,
        legalBalls: 120,
        isCompleted: true,
      },
    });
    // Beta innings (140 runs, 120 legal balls)
    await prisma.innings.create({
      data: {
        matchId: match1.id,
        inningsNumber: 2,
        battingTeamId: teamBeta.id,
        bowlingTeamId: teamAlpha.id,
        totalRuns: 140,
        wickets: 8,
        overs: 20.0,
        legalBalls: 120,
        isCompleted: true,
      },
    });

    // Match 2: Gamma vs Delta (Gamma: 180/3 in 20.0 ov, Delta: 120 all out (10 wkts) in 18.0 ov -> Gamma wins by 60 runs)
    // Note: In cricket NRR, if a team is all out in limited overs, their overs faced count as the full 20.0 overs (120 balls).
    const match2 = await prisma.match.create({
      data: {
        competitionId: tournamentId,
        format: 'T20',
        oversLimit: 20,
        venue: 'National Stadium',
        matchDate: new Date(),
        homeTeamId: teamGamma.id,
        awayTeamId: teamDelta.id,
        status: 'COMPLETED',
        winnerId: teamGamma.id,
        winMargin: 60,
        winType: 'RUNS',
        resultSummary: `${teamGamma.name} won by 60 runs`,
      },
    });
    await prisma.innings.create({
      data: {
        matchId: match2.id,
        inningsNumber: 1,
        battingTeamId: teamGamma.id,
        bowlingTeamId: teamDelta.id,
        totalRuns: 180,
        wickets: 3,
        overs: 20.0,
        legalBalls: 120,
        isCompleted: true,
      },
    });
    await prisma.innings.create({
      data: {
        matchId: match2.id,
        inningsNumber: 2,
        battingTeamId: teamDelta.id,
        bowlingTeamId: teamGamma.id,
        totalRuns: 120,
        wickets: 10,
        overs: 18.0,
        legalBalls: 108,
        isCompleted: true,
      },
    });

    // Match 3: Alpha vs Gamma (Alpha: 150/6 in 20.0 ov, Gamma: 150/9 in 20.0 ov -> TIED)
    const match3 = await prisma.match.create({
      data: {
        competitionId: tournamentId,
        format: 'T20',
        oversLimit: 20,
        venue: 'City Ground',
        matchDate: new Date(),
        homeTeamId: teamAlpha.id,
        awayTeamId: teamGamma.id,
        status: 'COMPLETED',
        winType: 'TIED',
        resultSummary: 'Match tied',
      },
    });
    await prisma.innings.create({
      data: {
        matchId: match3.id,
        inningsNumber: 1,
        battingTeamId: teamAlpha.id,
        bowlingTeamId: teamGamma.id,
        totalRuns: 150,
        wickets: 6,
        overs: 20.0,
        legalBalls: 120,
        isCompleted: true,
      },
    });
    await prisma.innings.create({
      data: {
        matchId: match3.id,
        inningsNumber: 2,
        battingTeamId: teamGamma.id,
        bowlingTeamId: teamAlpha.id,
        totalRuns: 150,
        wickets: 9,
        overs: 20.0,
        legalBalls: 120,
        isCompleted: true,
      },
    });

    // Match 4: Beta vs Delta (ABANDONED due to rain -> 1 point each)
    await prisma.match.create({
      data: {
        competitionId: tournamentId,
        format: 'T20',
        oversLimit: 20,
        venue: 'Bay Arena',
        matchDate: new Date(),
        homeTeamId: teamBeta.id,
        awayTeamId: teamDelta.id,
        status: 'ABANDONED',
        resultSummary: 'Match abandoned without a ball bowled',
      },
    });

    // Query Standings Table
    const standingsRes = await fetchJson(`${baseUrl}/tournaments/${tournamentId}/standings`);
    assert(standingsRes.status === 200, 'Retrieved tournament points table');
    const table = standingsRes.data.data.standings;

    assert(table.length === 4, 'Standings table contains all 4 competing franchises');

    const gammaStats = table.find((s: any) => s.teamId === teamGamma.id);
    const alphaStats = table.find((s: any) => s.teamId === teamAlpha.id);
    const betaStats = table.find((s: any) => s.teamId === teamBeta.id);
    const deltaStats = table.find((s: any) => s.teamId === teamDelta.id);

    assert(gammaStats.played === 2 && gammaStats.won === 1 && gammaStats.tied === 1 && gammaStats.points === 3, 'Gamma Kings: 2P, 1W, 1T, 3 Pts');
    assert(alphaStats.played === 2 && alphaStats.won === 1 && alphaStats.tied === 1 && alphaStats.points === 3, 'Alpha Lions: 2P, 1W, 1T, 3 Pts');
    assert(betaStats.played === 2 && betaStats.won === 0 && betaStats.lost === 1 && betaStats.noResult === 1 && betaStats.points === 1, 'Beta Strikers: 2P, 0W, 1L, 1NR, 1 Pt');
    assert(deltaStats.played === 2 && deltaStats.won === 0 && deltaStats.lost === 1 && deltaStats.noResult === 1 && deltaStats.points === 1, 'Delta Royals: 2P, 0W, 1L, 1NR, 1 Pt');

    // NRR Verification:
    // Gamma: Runs For = 180 + 150 = 330 in 40.0 ov (8.250). Runs Against = 120 (counted in 20.0 ov) + 150 in 20.0 ov = 270 in 40.0 ov (6.750). NRR = +1.500.
    // Alpha: Runs For = 160 + 150 = 310 in 40.0 ov (7.750). Runs Against = 140 + 150 = 290 in 40.0 ov (7.250). NRR = +0.500.
    assert(gammaStats.netRunRate > alphaStats.netRunRate, 'Gamma Kings NRR (+1.500) > Alpha Lions NRR (+0.500)');
    assert(table[0].teamId === teamGamma.id, 'Rank 1 is Gamma Kings due to superior Net Run Rate');
    assert(table[1].teamId === teamAlpha.id, 'Rank 2 is Alpha Lions');

    // 5. Team Match Statistics
    console.log('\n--- SECTION 5: Team Match Statistics ---');
    const alphaStatsRes = await fetchJson(`${baseUrl}/teams/${teamAlpha.id}/stats`);
    assert(alphaStatsRes.status === 200, 'Retrieved Alpha Lions team match statistics');
    const alphaStatsData = alphaStatsRes.data.data.stats;

    assert(alphaStatsData.matchesPlayed === 2, 'Team matches played = 2');
    assert(alphaStatsData.wins === 1 && alphaStatsData.losses === 0 && alphaStatsData.ties === 1, 'Team record: 1W, 0L, 1T');
    assert(alphaStatsData.winPercentage === 100.0, 'Win percentage = 100.0% (1 win out of 1 decided match)');
    assert(alphaStatsData.totalRunsScored === 310, 'Total runs scored = 310 (160 + 150)');
    assert(alphaStatsData.highestScore === 160, 'Highest score recorded = 160');
    assert(alphaStatsData.homeRecord.played === 2 && alphaStatsData.homeRecord.won === 1, 'Home record: 2 played, 1 won');
    assert(Array.isArray(alphaStatsData.recentForm) && alphaStatsData.recentForm.length === 2, 'Recent form tracked correctly');

    // 6. Match Toss & Playing XI Locking Hardening
    console.log('\n--- SECTION 6: Toss Validation & Playing XI Lock ---');
    // Create test players
    const p1 = await prisma.player.create({ data: { firstName: 'Player1', lastName: 'Alpha' } });
    const p2 = await prisma.player.create({ data: { firstName: 'Player2', lastName: 'Alpha' } });
    const p3 = await prisma.player.create({ data: { firstName: 'Player3', lastName: 'Beta' } });
    const p4 = await prisma.player.create({ data: { firstName: 'Player4', lastName: 'Beta' } });

    const newMatch = await prisma.match.create({
      data: {
        competitionId: tournamentId,
        format: 'T20',
        oversLimit: 20,
        venue: 'Eden Arena',
        matchDate: new Date(),
        homeTeamId: teamAlpha.id,
        awayTeamId: teamBeta.id,
        status: 'SCHEDULED',
      },
    });

    // Set squads for scheduled match
    const setSquadRes = await fetchJson(`${baseUrl}/matches/${newMatch.id}/squads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        homeTeamSquad: [
          { playerId: p1.id, isPlayingXI: true, battingOrder: 1 },
          { playerId: p2.id, isPlayingXI: true, battingOrder: 2 },
        ],
        awayTeamSquad: [
          { playerId: p3.id, isPlayingXI: true, battingOrder: 1 },
          { playerId: p4.id, isPlayingXI: true, battingOrder: 2 },
        ],
      }),
    });
    assert(setSquadRes.status === 200, 'Playing XI assigned successfully to scheduled match');

    // Toss validation: Invalid team ID
    const badTossRes = await fetchJson(`${baseUrl}/matches/${newMatch.id}/toss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tossWinnerId: teamGamma.id, // Not playing in this match
        tossDecision: 'BAT',
      }),
    });
    assert(badTossRes.status === 400, 'Toss rejected when winner is not one of the competing teams');

    // Valid Toss
    const validTossRes = await fetchJson(`${baseUrl}/matches/${newMatch.id}/toss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tossWinnerId: teamAlpha.id,
        tossDecision: 'BAT',
      }),
    });
    assert(validTossRes.status === 200 && validTossRes.data.data.status === 'TOSS_COMPLETED', 'Toss recorded and status updated to TOSS_COMPLETED');

    // Start Innings -> status transitions to LIVE
    const startInnRes = await fetchJson(`${baseUrl}/scoring/${newMatch.id}/start-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        inningsNumber: 1,
        battingTeamId: teamAlpha.id,
        bowlingTeamId: teamBeta.id,
        strikerId: p1.id,
        nonStrikerId: p2.id,
        bowlerId: p3.id,
      }),
    });
    assert(startInnRes.status === 200 || startInnRes.status === 201, '1st Innings started; match status transitioned to LIVE');

    // Playing XI Lock: Attempt to modify squad while match is LIVE
    const lockSquadRes = await fetchJson(`${baseUrl}/matches/${newMatch.id}/squads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        homeTeamSquad: [{ playerId: p1.id, isPlayingXI: true }],
      }),
    });
    assert(lockSquadRes.status === 400, 'Squad modification rejected when match is LIVE (Playing XI locked)');

    // Complete Match
    await prisma.match.update({
      where: { id: newMatch.id },
      data: { status: 'COMPLETED' },
    });

    // Toss lock: Attempt to record toss on completed match
    const completedTossRes = await fetchJson(`${baseUrl}/matches/${newMatch.id}/toss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tossWinnerId: teamAlpha.id,
        tossDecision: 'BOWL',
      }),
    });
    assert(completedTossRes.status === 400, 'Toss rejected on already completed match');

    // 7. Full Scorecard & Real-time Integration
    console.log('\n--- SECTION 7: Tournament Match Scorecard Verification ---');
    const scorecardRes = await fetchJson(`${baseUrl}/scoring/${match1.id}/scorecard`);
    assert(scorecardRes.status === 200, 'Scorecard retrieved for completed tournament fixture');
    assert(scorecardRes.data.data.innings.length === 2, 'Scorecard contains both innings for completed tournament match');

    console.log('\n====================================================');
    console.log(`🏁 PHASE 2 TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
  } catch (err: any) {
    console.error('Test execution exception:', err);
    failed++;
  } finally {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests();
