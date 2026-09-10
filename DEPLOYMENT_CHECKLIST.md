# 📋 Production Deployment & Launch Checklist

Use this checklist prior to rolling out Cricket Master to production.

---

## 1. Pre-Deployment Stage
- [x] **Zero Regression Automated Test Pass**:
  - `test-phase0.ts` (15/15 PASS)
  - `test-phase1.ts` (33/33 PASS)
  - `test-phase1-hardening.ts` (63/63 PASS)
  - `test-phase2.ts` (37/37 PASS)
  - `test-phase3.ts` (37/37 PASS)
  - `test-phase4.ts` (79/79 PASS)
  - `test-phase5.ts` (PASS)
- [x] **TypeScript & Production Build Verification**:
  - Backend `npm run build` exits with 0 TypeScript compilation errors.
  - Frontend `npm run build` exits with 0 Vite production build errors.
  - `npx prisma validate` confirms valid Prisma schema.
  - `npx prisma generate` generates latest Prisma client.
- [x] **Security & Secrets Audit**:
  - Zero hardcoded passwords, tokens, or JWT secrets in Git repository.
  - `.env.example` verified with safe placeholders.
  - Password hashes, tokens, and Authorization headers redacted from logging output.
  - Stack traces and internal database errors masked in production responses.
- [x] **Database & Migrations**:
  - Indexes added on high-frequency query fields (`Team.status`, `Competition.status`, `BallEvent.dismissedPlayerId`, `BallEvent.fielderId`).
  - Automated database backup script verified.

---

## 2. Deployment Stage
- [x] **Container & Environment Setup**:
  - Docker Compose file configured with multi-stage backend & frontend builds.
  - Persistent volume mounts for database `/app/data` and backups `/app/backups`.
  - CORS origins restricted to authorized production domain(s).
  - Rate limiting parameters tuned for production load.
- [x] **Reverse Proxy & Headers**:
  - Nginx configured with gzip compression, security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
  - SSE proxy configured with `proxy_buffering off;` and extended read timeouts.

---

## 3. Post-Deployment Verification
- [x] **Health Probes**:
  - `GET /health` returns `200 OK` with database `CONNECTED`.
  - `GET /health/ready` returns `200 OK` readiness probe.
  - `GET /health/live` returns `200 OK` liveness probe.
- [x] **End-to-End Core Workflows**:
  - Authentication & JWT token refresh.
  - Role-Based Access Control (RBAC) enforcement across all 7 user tiers.
  - Match creation, squad selection, toss recording.
  - Live scoring engine delivery recording, extras, wickets, and strike rotation.
  - Real-time SSE streaming to public spectator clients with 25s keepalive heartbeat.
  - 1-click Undo / delivery rollback.
  - Completed match lockdown and final scorecard immutability.
  - Analytics, format splits, and deterministic rankings computation.
  - Multi-entity global search.
