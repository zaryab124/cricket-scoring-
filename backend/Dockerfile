# Multi-stage production Dockerfile for Cricket Management Platform Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies & openssl for Prisma
RUN apk add --no-cache openssl

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

# Install runtime openssl for Prisma query engine
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=5000

# Copy runtime dependencies and compiled output from builder
COPY package*.json ./
COPY prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create backups and database directories
RUN mkdir -p /app/backups /app/data

EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health/ready || exit 1

CMD ["node", "dist/server.js"]
