# Multi-stage production Dockerfile for Cricket Management Platform Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build Vite production bundle
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src/
COPY public ./public/

RUN npm run build

# -------------------------------------------------------------
# Production Web Server Stage (Nginx Alpine)
# -------------------------------------------------------------
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
