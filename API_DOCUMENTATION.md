# 🏏 Cricket Master API Reference Specification

Base URL: `http://localhost:5000/api/v1`

---

## 1. Authentication & Session Management (`/api/v1/auth`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/auth/register` | `POST` | Public | Register a new user account |
| `/auth/login` | `POST` | Public | Authenticate user and receive JWT access & refresh tokens |
| `/auth/refresh-token` | `POST` | Public | Refresh expired access token with valid refresh token |
| `/auth/logout` | `POST` | Authenticated | Revoke refresh token and invalidate active session |
| `/auth/me` | `GET` | Authenticated | Retrieve authenticated user profile and assigned roles |

---

## 2. Match Management & Fixtures (`/api/v1/matches`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/matches` | `GET` | Public / Auth | List matches with optional filters (`status`, `competitionId`, `teamId`) |
| `/matches/:id` | `GET` | Public / Auth | Retrieve full match overview, toss info, and teams |
| `/matches` | `POST` | Admins / Scorer | Create a new match fixture |
| `/matches/:id/squad` | `POST` | Admins / Manager | Configure Playing XI and bench for home & away teams |
| `/matches/:id/toss` | `POST` | Admins / Scorer | Record toss winner and decision (`BAT` / `BOWL`) |
| `/matches/:id/status` | `PATCH` | Admins / Scorer | Update match operational status (`LIVE`, `RAIN_DELAY`, `ABANDONED`, `COMPLETED`) |

---

## 3. Live Cricket Scoring Engine (`/api/v1/scoring`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/scoring/:matchId/scorecard` | `GET` | Public / Auth | Retrieve complete live structured scorecard with batting/bowling figures |
| `/scoring/:matchId/live-stream` | `GET` | Public / Auth | Connect to real-time Server-Sent Events (SSE) live delivery feed |
| `/scoring/:matchId/start-innings` | `POST` | Scorer / Admins | Initialize innings with opening batsmen and bowler |
| `/scoring/:matchId/ball` | `POST` | Scorer / Admins | Record delivery with extras, boundaries, wickets, and strike rotation |
| `/scoring/:matchId/undo` | `POST` | Scorer / Admins | Rollback last delivery in active innings |
| `/scoring/:matchId/bowler` | `POST` | Scorer / Admins | Change active bowler (enforces consecutive over restriction) |
| `/scoring/:matchId/batsman` | `POST` | Scorer / Admins | Set incoming batsman on dismissal |
| `/scoring/:matchId/complete-innings` | `POST` | Scorer / Admins | Conclude or declare active innings |

---

## 4. Tournaments & Competitions (`/api/v1/tournaments`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/tournaments` | `GET` | Public / Auth | List competitions & tournaments with pagination |
| `/tournaments/:id` | `GET` | Public / Auth | Retrieve tournament details and rules configuration |
| `/tournaments` | `POST` | Tournament Admins | Create a new competition / tournament |
| `/tournaments/:id/teams` | `GET` | Public / Auth | List participating teams in tournament |
| `/tournaments/:id/teams` | `POST` | Tournament Admins | Register a team to tournament |
| `/tournaments/:id/standings` | `GET` | Public / Auth | Get live tournament points table and Net Run Rate (NRR) |
| `/tournaments/:id/analytics` | `GET` | Public / Auth | Retrieve Orange Cap (top batters) & Purple Cap (top bowlers) leaderboards |

---

## 5. Teams & Squads (`/api/v1/teams`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/teams` | `GET` | Public / Auth | List teams with search and filters |
| `/teams/:id` | `GET` | Public / Auth | Retrieve team profile, home ground, and current squad |
| `/teams` | `POST` | Admins / Manager | Register a new team club |
| `/teams/:id` | `PUT` | Admins / Manager | Update team details (IDOR verified for assigned team manager) |
| `/teams/:id/members` | `POST` | Admins / Manager | Add player to team squad roster |
| `/teams/:id/members/:playerId` | `DELETE` | Admins / Manager | Remove player from team squad roster |
| `/teams/:id/stats` | `GET` | Public / Auth | Retrieve team win/loss metrics and statistics |

---

## 6. Players & Intelligence (`/api/v1/players`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/players` | `GET` | Public / Auth | List athletes with role and batting/bowling style filters |
| `/players/:id` | `GET` | Public / Auth | Retrieve player profile, career summary, and recent form |
| `/players` | `POST` | Admins / Scorer | Create athlete profile |
| `/players/:id/analytics` | `GET` | Public / Auth | Retrieve format splits (`T20`, `ODI`, `TEST`) and 3W/5W milestones |

---

## 7. Rankings & Statistics (`/api/v1/stats`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/stats/rankings` | `GET` | Public / Auth | Retrieve deterministic power rankings (`BATTING`, `BOWLING`, `ALL_ROUNDER`) |
| `/stats/admin-dashboard` | `GET` | Super Admin | Retrieve engine telemetry and database totals |
| `/stats/matches/:matchId/analytics` | `GET` | Public / Auth | Retrieve over progression trajectory, comparison, and partnerships |

---

## 8. Global Search (`/api/v1/search`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/search?q=query` | `GET` | Public / Auth | Multi-entity search across players, teams, tournaments, and fixtures |

---

## 9. System Health Probes

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/health` | `GET` | Public | Top-level system health and database connectivity probe |
| `/health/ready` | `GET` | Public | Kubernetes/Docker readiness probe (`SELECT 1`) |
| `/health/live` | `GET` | Public | Liveness probe returning process uptime |
| `/api/v1/health` | `GET` | Public | API engine detailed telemetry |
