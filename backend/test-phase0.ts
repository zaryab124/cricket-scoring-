import { createApp } from './src/app.js';
import { prisma } from './src/services/prisma.js';
import http from 'http';

const app = createApp();
const PORT = 5098;

async function runTests() {
  console.log('====================================================');
  console.log('🏏 CRICKET MASTER - PHASE 0 FINAL HARDENING & RBAC TEST');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`🚀 Test server listening on http://localhost:${PORT}`);

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
    // 1. Health Check Test
    console.log('\n--- 1. Platform Health Check ---');
    const health = await fetchJson(`${baseUrl}/health`);
    assert(health.status === 200 && health.data.data?.status === 'UP', 'Health check returns 200 and UP status');

    // 2. Authentication & JWT Security Tests
    console.log('\n--- 2. Authentication & JWT Security ---');
    const superAdminLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'superadmin@cricketmaster.io', password: 'Password@123' }),
    });
    assert(superAdminLogin.status === 200 && !!superAdminLogin.data.data?.accessToken, 'Super Admin login returns JWT access token');
    const superAdminToken = superAdminLogin.data.data?.accessToken;

    const viewerLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'viewer@cricketmaster.io', password: 'Password@123' }),
    });
    assert(viewerLogin.status === 200 && viewerLogin.data.data?.user?.role === 'VIEWER', 'Viewer login returns role VIEWER');
    const viewerToken = viewerLogin.data.data?.accessToken;

    const meRes = await fetchJson(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(meRes.status === 200 && meRes.data.data?.email === 'superadmin@cricketmaster.io', 'Auth /me returns profile of authenticated actor');

    // 3. API Input Validation Tests
    console.log('\n--- 3. API Input Validation & Error Handling ---');
    const invalidLogin = await fetchJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email', password: '' }),
    });
    assert(invalidLogin.status === 422 && invalidLogin.data.success === false, 'Invalid input payload rejected with 422 Validation Error');

    // 4. Role-Based Access Control (RBAC) Enforcement Tests
    console.log('\n--- 4. Role-Based Access Control (RBAC) Enforcement ---');
    
    // Super Admin accessing audit logs -> should succeed (200)
    const adminAudit = await fetchJson(`${baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(adminAudit.status === 200, 'Super Admin CAN access /api/v1/audit-logs (200 OK)');

    // Viewer accessing audit logs -> should be rejected (403 Forbidden)
    const viewerAudit = await fetchJson(`${baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert(viewerAudit.status === 403, 'Viewer CANNOT access /api/v1/audit-logs (403 Forbidden strictly enforced)');

    // Anonymous request to protected endpoint -> 401 Unauthorized
    const anonAudit = await fetchJson(`${baseUrl}/audit-logs`);
    assert(anonAudit.status === 401, 'Anonymous request to protected route is rejected (401 Unauthorized)');

    // Viewer attempting to modify user role -> 403 Forbidden
    const viewerRoleUpdate = await fetchJson(`${baseUrl}/users/${viewerLogin.data.data.user.id}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({ role: 'SUPER_ADMIN' }),
    });
    assert(viewerRoleUpdate.status === 403, 'Viewer CANNOT modify user roles (403 Forbidden)');

    // 5. Database Integrity & Entity Relational Foundations
    console.log('\n--- 5. Database Relational Foundations ---');
    const statsRes = await fetchJson(`${baseUrl}/users/platform-stats`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(
      statsRes.status === 200 &&
      statsRes.data.data?.totalTeams >= 4 &&
      statsRes.data.data?.totalUsers >= 7,
      'Platform statistics aggregates counts across all database entities'
    );

    const teamsRes = await fetchJson(`${baseUrl}/teams`);
    assert(teamsRes.status === 200 && teamsRes.data.data?.length >= 4, 'Teams directory lists seeded clubs');

    const playersRes = await fetchJson(`${baseUrl}/players`);
    assert(playersRes.status === 200 && playersRes.data.data?.length >= 5, 'Players catalog lists athletes with batting/bowling attributes');

    const tournamentsRes = await fetchJson(`${baseUrl}/tournaments`);
    assert(tournamentsRes.status === 200 && tournamentsRes.data.data?.length >= 2, 'Tournaments & Leagues service lists competitions');

    const matchesRes = await fetchJson(`${baseUrl}/matches`);
    assert(matchesRes.status === 200 && matchesRes.data.data?.length >= 2, 'Fixtures service lists scheduled matches');

    const notifsRes = await fetchJson(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(notifsRes.status === 200 && notifsRes.data.data?.length >= 1, 'Notifications service retrieves user notifications');

    console.log('\n====================================================');
    console.log(`🏁 FINAL VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
