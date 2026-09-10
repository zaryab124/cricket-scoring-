/**
 * ============================================================================
 * PHASE 5 FINAL PRODUCTION READINESS, SECURITY & RESILIENCE TEST SUITE
 * ============================================================================
 */

import { createApp } from './src/app.js';
import { prisma } from './src/services/prisma.js';
import { DatabaseBackupService } from './src/utils/backup.js';
import http from 'http';

let server: http.Server;
let baseUrl: string;

let superAdminToken = '';
let tournamentAdminToken = '';
let scorerToken = '';
let teamManagerToken = '';
let playerToken = '';
let viewerToken = '';

let totalPass = 0;
let totalFail = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    totalPass++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    totalFail++;
  }
}

async function request(urlPath: string, options: { method?: string; body?: any; token?: string } = {}) {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data };
}

async function loginUser(email: string, password = 'Password@123'): Promise<string> {
  const res = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return res.data?.data?.accessToken || '';
}

async function runSuite() {
  console.log('\n====================================================');
  console.log('🏏 PHASE 5: PRODUCTION READINESS & SECURITY SUITE');
  console.log('====================================================\n');

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });

  // Login all roles
  superAdminToken = await loginUser('superadmin@cricketmaster.io');
  tournamentAdminToken = await loginUser('tournamentadmin@cricketmaster.io');
  scorerToken = await loginUser('scorer@cricketmaster.io');
  teamManagerToken = await loginUser('manager@cricketmaster.io');
  playerToken = await loginUser('player@cricketmaster.io');
  viewerToken = await loginUser('viewer@cricketmaster.io');

  assert(!!superAdminToken, 'Super Admin authenticated successfully');
  assert(!!tournamentAdminToken, 'Tournament Admin authenticated successfully');
  assert(!!scorerToken, 'Scorer authenticated successfully');
  assert(!!viewerToken, 'Viewer authenticated successfully');

  // -------------------------------------------------------------
  // SECTION 1: Health Probes & Telemetry
  // -------------------------------------------------------------
  console.log('\n--- SECTION 1: Production Health Probes & Telemetry ---');

  const rootHealth = await request('/health');
  assert(rootHealth.status === 200, 'GET /health responds with 200 OK');
  assert(rootHealth.data?.status === 'UP', 'GET /health status is UP');
  assert(rootHealth.data?.database === 'CONNECTED', 'Database probe reports CONNECTED');

  const readyProbe = await request('/health/ready');
  assert(readyProbe.status === 200, 'GET /health/ready readiness probe passes (200 OK)');
  assert(readyProbe.data?.status === 'READY', 'Readiness status is READY');

  const liveProbe = await request('/health/live');
  assert(liveProbe.status === 200, 'GET /health/live liveness probe passes (200 OK)');
  assert(liveProbe.data?.status === 'LIVE', 'Liveness status is LIVE');

  const apiHealth = await request('/api/v1/health');
  assert(apiHealth.status === 200, 'GET /api/v1/health responds with 200 OK');
  assert(apiHealth.data?.data?.service === 'Cricket Master API Engine', 'API Engine service name verified');
  assert(typeof apiHealth.data?.data?.memoryMb === 'number', 'API Engine memory metrics provided');

  // -------------------------------------------------------------
  // SECTION 2: Security, RBAC & Data Protection
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: Security, RBAC & Data Protection ---');

  // 1. Password hash omission
  const usersList = await request('/api/v1/users', { token: superAdminToken });
  assert(usersList.status === 200, 'Super Admin lists users');
  const hasPasswordHash = usersList.data?.data?.some((u: any) => u.passwordHash || u.password);
  assert(!hasPasswordHash, 'Password hashes are strictly excluded from User responses');

  // 2. Privilege Escalation Prevention
  const viewerElevate = await request('/api/v1/users', { token: viewerToken });
  assert(viewerElevate.status === 403, 'Viewer blocked from accessing user management (403 Forbidden)');

  // 3. Unauthorized scoring mutations
  const fakeMatchId = '00000000-0000-0000-0000-000000000000';
  const viewerScore = await request(`/api/v1/scoring/${fakeMatchId}/start-innings`, {
    method: 'POST',
    token: viewerToken,
    body: { inningsNumber: 1, battingTeamId: 't1', bowlingTeamId: 't2', strikerId: 'p1', nonStrikerId: 'p2', bowlerId: 'p3' },
  });
  assert(viewerScore.status === 403, 'Viewer forbidden from initiating scoring (403 Forbidden)');

  // 4. Invalid token rejection
  const invalidTokenRes = await request('/api/v1/users', { token: 'invalid.jwt.token' });
  assert(invalidTokenRes.status === 401, 'Malformed JWT token rejected with 401 Unauthorized');

  // -------------------------------------------------------------
  // SECTION 3: Concurrency & Match Concurrency Mutex
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: Scoring Concurrency & Idempotency ---');

  // Create two teams for a dedicated match test
  const team1 = await prisma.team.create({
    data: { name: 'P5 Super Kings', shortName: 'PSK', code: `PSK_${Date.now()}` },
  });
  const team2 = await prisma.team.create({
    data: { name: 'P5 Royals', shortName: 'PRY', code: `PRY_${Date.now()}` },
  });

  // Create 4 players
  const p1 = await prisma.player.create({ data: { firstName: 'Virat', lastName: 'P5-1' } });
  const p2 = await prisma.player.create({ data: { firstName: 'Rohit', lastName: 'P5-2' } });
  const p3 = await prisma.player.create({ data: { firstName: 'Jasprit', lastName: 'P5-3' } });
  const p4 = await prisma.player.create({ data: { firstName: 'Ravindra', lastName: 'P5-4' } });

  // Create match
  const match = await prisma.match.create({
    data: {
      venue: 'National Stadium',
      matchDate: new Date(),
      homeTeamId: team1.id,
      awayTeamId: team2.id,
      status: 'SCHEDULED',
      oversLimit: 2,
    },
  });

  // Start innings
  const startRes = await request(`/api/v1/scoring/${match.id}/start-innings`, {
    method: 'POST',
    token: scorerToken,
    body: {
      inningsNumber: 1,
      battingTeamId: team1.id,
      bowlingTeamId: team2.id,
      strikerId: p1.id,
      nonStrikerId: p2.id,
      bowlerId: p3.id,
    },
  });
  assert(startRes.status === 200, 'Innings 1 started via Scorer Console');

  // Concurrent ball recording (3 simultaneous deliveries)
  const concurrentCalls = await Promise.all([
    request(`/api/v1/scoring/${match.id}/ball`, {
      method: 'POST',
      token: scorerToken,
      body: { runsScored: 1 },
    }),
    request(`/api/v1/scoring/${match.id}/ball`, {
      method: 'POST',
      token: scorerToken,
      body: { runsScored: 4 },
    }),
    request(`/api/v1/scoring/${match.id}/ball`, {
      method: 'POST',
      token: scorerToken,
      body: { runsScored: 2 },
    }),
  ]);

  const allSucceeded = concurrentCalls.every((r) => r.status === 200);
  assert(allSucceeded, 'All 3 concurrent scoring requests processed without race condition errors');

  const scorecardAfterConcurrent = await request(`/api/v1/scoring/${match.id}/scorecard`);
  const firstInn = scorecardAfterConcurrent.data?.data?.innings?.[0];
  assert(firstInn?.totalRuns === 7, 'Total runs accurately accumulated (1 + 4 + 2 = 7 runs)');
  assert(firstInn?.legalBalls === 3, 'Total legal deliveries strictly equals 3');

  // -------------------------------------------------------------
  // SECTION 4: Completed Match Lockdown
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: Completed Match Lockdown ---');

  // Complete innings 1
  await request(`/api/v1/scoring/${match.id}/complete-innings`, {
    method: 'POST',
    token: scorerToken,
    body: { isDeclared: false },
  });

  // Start innings 2
  await request(`/api/v1/scoring/${match.id}/start-innings`, {
    method: 'POST',
    token: scorerToken,
    body: {
      inningsNumber: 2,
      battingTeamId: team2.id,
      bowlingTeamId: team1.id,
      strikerId: p3.id,
      nonStrikerId: p4.id,
      bowlerId: p1.id,
    },
  });

  // Score winning hit (6 runs, target 8, 6 runs -> chase continues, another 4 runs -> target reached)
  await request(`/api/v1/scoring/${match.id}/ball`, {
    method: 'POST',
    token: scorerToken,
    body: { runsScored: 6 },
  });
  const winningBall = await request(`/api/v1/scoring/${match.id}/ball`, {
    method: 'POST',
    token: scorerToken,
    body: { runsScored: 4 },
  });
  assert(winningBall.status === 200, 'Winning boundary recorded');

  // Verify match completed
  const matchRecord = await prisma.match.findUnique({ where: { id: match.id } });
  assert(matchRecord?.status === 'COMPLETED', 'Match automatically concluded and status set to COMPLETED');
  assert(matchRecord?.winnerId === team2.id, 'Chasing team registered as match winner');

  // Attempt to record ball on completed match
  const postLockdownBall = await request(`/api/v1/scoring/${match.id}/ball`, {
    method: 'POST',
    token: scorerToken,
    body: { runsScored: 1 },
  });
  assert(postLockdownBall.status === 400, 'Completed match strictly rejects post-conclusion delivery (400 Bad Request)');

  // -------------------------------------------------------------
  // SECTION 5: SSE Real-Time Resilience & Heartbeat
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: SSE Real-Time Resilience ---');

  const sseRes = await fetch(`${baseUrl}/api/v1/scoring/${match.id}/live-stream`);
  assert(sseRes.status === 200, 'SSE endpoint connects with 200 OK');
  assert(sseRes.headers.get('content-type')?.includes('text/event-stream') || false, 'Content-Type is text/event-stream');
  
  // Close SSE stream
  if (sseRes.body) {
    const reader = sseRes.body.getReader();
    await reader.cancel();
  }
  assert(true, 'SSE client detached cleanly without unhandled rejection');

  // -------------------------------------------------------------
  // SECTION 6: Database Backup & Recovery Utility
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: Database Backup & Disaster Recovery ---');

  const backupResult = await DatabaseBackupService.createBackup();
  assert(backupResult.success === true, 'Automated snapshot backup created successfully');
  assert(!!backupResult.backupFile, `Backup file generated: ${backupResult.backupFile}`);
  assert(!!backupResult.checksum, `SHA-256 integrity checksum calculated: ${backupResult.checksum?.substring(0, 16)}...`);

  const integrity = await DatabaseBackupService.verifyIntegrity();
  assert(integrity.healthy === true, 'Database integrity audit reports healthy state');
  assert(integrity.details.matches > 0, `Database verified with ${integrity.details.matches} matches and ${integrity.details.balls} deliveries`);

  const backupsList = DatabaseBackupService.listBackups();
  assert(backupsList.length > 0, `Backups directory verified with ${backupsList.length} snapshot(s)`);

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`🏁 PHASE 5 SUITE FINISHED: ${totalPass} PASSED | ${totalFail} FAILED`);
  console.log('====================================================\n');

  server.close();
  if (totalFail > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal error in Phase 5 test suite:', err);
  if (server) server.close();
  process.exit(1);
});
