# 🛠️ Operations & Production Maintenance Guide

## 1. Service Management & Startup

### Local / Dedicated Server
```bash
# Start Backend in Production Mode
cd backend
npm run build
npm start

# Start Frontend Production Server (or serve via Nginx / Cloudflare Pages)
cd frontend
npm run build
```

### Docker Container Management
```bash
# Start all containers in the background
docker-compose up -d

# View real-time container logs
docker-compose logs -f backend

# Stop all containers
docker-compose down
```

---

## 2. Database Migrations & Schema Updates

```bash
cd backend

# Validate schema without making database modifications
npx prisma validate

# Generate updated Prisma client
npx prisma generate

# Apply non-destructive schema synchronization
npx prisma db push

# Execute database seeding
npm run db:seed
```

---

## 3. Database Backup & Disaster Recovery Strategy

The platform includes a built-in automated backup utility (`DatabaseBackupService` in `src/utils/backup.ts`) that creates structured JSON snapshots with SHA-256 verification hashes.

### Automated Backups
- **Frequency**: Daily snapshot at midnight UTC, with hourly backups during live tournaments.
- **Location**: `/app/backups/` (mounted as a Docker persistent volume).
- **Retention**: Keep last 30 daily backups and last 12 monthly archives.

### Running a Manual Backup
```bash
cd backend
npx tsx -e "import { DatabaseBackupService } from './src/utils/backup.js'; DatabaseBackupService.createBackup().then(console.log);"
```

### Verifying Database Integrity
```bash
cd backend
npx tsx -e "import { DatabaseBackupService } from './src/utils/backup.js'; DatabaseBackupService.verifyIntegrity().then(console.log);"
```

---

## 4. Health Checks & Monitoring

The application exposes standard Kubernetes and container health probes:

- **Readiness Probe**: `GET http://localhost:5000/health/ready`
  - Returns `200 OK` (`{"status":"READY","database":"CONNECTED"}`) when the database responds to queries.
  - Returns `503 Service Unavailable` if database communication fails.
- **Liveness Probe**: `GET http://localhost:5000/health/live`
  - Returns `200 OK` (`{"status":"LIVE","uptimeSeconds":...}`) to confirm Node.js event loop responsiveness.
- **Full Telemetry**: `GET http://localhost:5000/api/v1/health`
  - Returns uptime, heap memory usage, environment, and subsystem status.

---

## 5. Troubleshooting & Incident Response

### Problem: SSE Disconnects or Gateway Timeouts
- **Cause**: Intermediate proxy or load balancer timing out idle connections.
- **Resolution**: The backend sends `:keepalive\n\n` pings every 25 seconds. Ensure Nginx or reverse-proxy has `proxy_read_timeout 86400s;` and `proxy_buffering off;` enabled as configured in `frontend/nginx.conf`.

### Problem: Database Locked (SQLite)
- **Cause**: Multiple write operations overlapping outside transaction lock.
- **Resolution**: All scoring operations utilize `withMatchLock` in `scoring.engine.ts`. For ultra-high concurrency environments, configure PostgreSQL in `DATABASE_URL`.

### Problem: Rate Limit Triggered on Legitimate Scorer
- **Resolution**: Adjust `RATE_LIMIT_MAX_REQUESTS` in `.env` to accommodate intensive real-time administrative scoring operations.
