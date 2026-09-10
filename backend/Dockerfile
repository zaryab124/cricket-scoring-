# Multi-stage production Dockerfile for Cricket Management Platform Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source code and build TypeScript
COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

# -------------------------------------------------------------
# Production Runner Stage
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy runtime files
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Create backups and database directories
RUN mkdir -p /app/backups /app/data

EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health/ready || exit 1

CMD ["node", "dist/server.js"]
