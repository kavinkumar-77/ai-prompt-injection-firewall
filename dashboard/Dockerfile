# syntax=docker/dockerfile:1
# Multi-stage production Dockerfile for Project AEGIS Operator Dashboard

# -----------------------------------------------------------------------------
# Stage 1: Build Static Web Assets
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY dashboard/package.json ./
RUN npm install

COPY dashboard/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Serve via Nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine-slim AS runner

COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
