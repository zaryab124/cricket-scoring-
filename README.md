# 🏏 Cricket Master — Professional Cricket Management & Live Scoring Platform

[![Platform Status](https://img.shields.io/badge/Platform%20Status-Production%20Ready-brightgreen)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue)](https://www.prisma.io/)
[![Test Suite](https://img.shields.io/badge/Tests-300%2B%20Passing-success)](https://github.com)

A scalable, full-stack platform for managing cricket tournaments, clubs, player intelligence, professional ball-by-ball scoring, real-time spectator feeds via Server-Sent Events (SSE), and deterministic ICC/custom power rankings.

---

## 🌟 Architecture & Key Features

### 1. 🛡️ Enterprise Security & Multi-Tier RBAC
- **Strict Server-Side Authorization**: Granular roles: `SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `LEAGUE_ADMIN`, `SCORER`, `TEAM_MANAGER`, `PLAYER`, and `VIEWER`.
- **Credential Protection**: Automatic JWT access & refresh token rotation, bcrypt password hashing, and zero password/hash leakage in logs or API payloads.
- **Abuse & DoS Mitigation**: Tuned rate limiters for authentication (`authRateLimiter`), instant search (`searchRateLimiter`), and general API traffic (`apiRateLimiter`).

### 2. ⚡ Authoritative Ball-by-Ball Cricket Engine
- **MCC / ICC Laws Compliance**: Full handling of legal deliveries, wides, no-balls (with free hits), byes, leg-byes, and penalty runs.
- **Wicket & Dismissal Logic**: Bowled, Caught, LBW, Run Out (credited without bowler bias), Stumped, Hit Wicket, Retired Hurt, and Retired Out.
- **Strike Rotation & Over Management**: Automatic striker swap on odd runs, over-end strike rotation, and consecutive over restriction enforcement.
- **Transactional Integrity & Idempotency**: Atomic database state transitions and per-match mutex locks preventing race conditions from simultaneous scoring requests.
- **1-Click Undo / Rollback**: Instant rollback of the last delivery restoring exact striker, non-striker, bowler, and run tally states.
- **Completed Match Lockdown**: Immutability safeguard sealing completed matches from post-conclusion tampering.

### 3. 📡 Real-Time Live Spectator Experience (SSE)
- **High-Throughput Event Streaming**: Zero-lag delivery broadcasts from Scorer Console to public viewers via Server-Sent Events.
- **Resilient Heartbeat & Connection Management**: Automatic 25s keepalive ping, connection timeout prevention, and leak-free cleanup on viewer disconnects.

### 4. 📊 Advanced Analytics & Deterministic Power Rankings
- **Player Career Intelligence**: Batting & bowling format splits (`T20`, `ODI`, `TEST`), 3W & 5W hauls, 50s, 100s, and recent 5-match form trends.
- **Tournament Leaderboards**: Scoped Orange Cap (top run-scorers) and Purple Cap (top wicket-takers) with live Net Run Rate (NRR) computation.
- **Deterministic Player Ratings**: Transparent mathematical formulas for Batting, Bowling, and All-Rounder power rankings.

### 5. 🔍 Multi-Entity Global Search & Platform Telemetry
- Fast typeahead search across players, teams, tournaments, and fixtures.
- Centralized administrator telemetry tracking database aggregates, live matches, and system health.

---

## 🚀 Technology Stack

| Layer | Technologies |
|---|---|
| **Backend API** | Node.js, Express, TypeScript, Prisma ORM, Winston, Morgan, Zod, Helmet, Express-Rate-Limit |
| **Frontend SPA** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios, React Router 6 |
| **Database** | SQLite (Dev/Staging) / PostgreSQL (Production Compatible via Prisma) |
| **Real-Time** | Server-Sent Events (SSE) with Node.js EventEmitter |
| **Containerization** | Docker (Multi-stage builds), Docker Compose, Nginx Alpine |

---

## 📦 Quick Start & Local Setup

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repository_url>
cd "cricket master"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
```bash
# Backend configuration
cd ../backend
cp .env.example .env

# Frontend configuration
cd ../frontend
cp .env.example .env
```

### 3. Initialize Database & Seed Baseline Data
```bash
cd ../backend
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Run Development Servers
```bash
# Terminal 1: Start Backend API (runs on port 5000)
cd backend
npm run dev

# Terminal 2: Start Frontend Web Application (runs on port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Production Deployment

To run the complete platform in production containers with one command:

```bash
docker-compose up --build -d
```

- **Frontend SPA**: `http://localhost:80`
- **Backend API**: `http://localhost:5000`
- **Health Probes**: `http://localhost:5000/health/ready`

---

## 🧪 Comprehensive Test Suites

The platform includes over 300 automated integration, edge-case, and security tests:

```bash
cd backend

# Run individual test suites
npx tsx test-phase0.ts           # Phase 0: Foundation & RBAC
npx tsx test-phase1.ts           # Phase 1: Core Scoring & Match Lifecycle
npx tsx test-phase1-hardening.ts # Phase 1 Hardening: Deep Cricket Edge Cases
npx tsx test-phase2.ts           # Phase 2: Tournaments & SQS
npx tsx test-phase3.ts           # Phase 3: Match Operations & Live Feeds
npx tsx test-phase4.ts           # Phase 4: Analytics, Intelligence & Rankings
npx tsx test-phase5.ts           # Phase 5: Security, Concurrency & Production
```

---

## 📑 Default Seed Accounts

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `superadmin@cricketmaster.io` | `Password@123` |
| **Tournament Admin** | `tournamentadmin@cricketmaster.io` | `Password@123` |
| **Scorer** | `scorer@cricketmaster.io` | `Password@123` |
| **Team Manager** | `manager@cricketmaster.io` | `Password@123` |
| **Player** | `player@cricketmaster.io` | `Password@123` |
| **Viewer** | `viewer@cricketmaster.io` | `Password@123` |

---

## 📚 Documentation Links
- [API Documentation](file:///c:/cricket%20master/API_DOCUMENTATION.md)
- [Operations Guide](file:///c:/cricket%20master/OPERATIONS_GUIDE.md)
- [Deployment Checklist](file:///c:/cricket%20master/DEPLOYMENT_CHECKLIST.md)
