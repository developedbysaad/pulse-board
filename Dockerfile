# syntax=docker/dockerfile:1.7

# ─── Stage 1: install all workspace deps (including dev) ────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY docs/package.json ./docs/

RUN npm ci

# ─── Stage 2: build frontend SPA + Starlight docs ───────────────────────
FROM deps AS builder
COPY backend ./backend
COPY frontend ./frontend
COPY docs ./docs
RUN npm run build

# ─── Stage 3: slim runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Skip the `prepare: husky` lifecycle hook in production. husky is a
# devDependency, so `npm ci --omit=dev` doesn't install it — without
# this flag the prepare script would crash with `husky: not found`.
ENV HUSKY=0

# Production deps only (workspaces still needed so npm resolves the tree)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY docs/package.json ./docs/
RUN npm ci --omit=dev && npm cache clean --force

# Backend source + pre-built FE/docs
COPY backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/docs/dist ./docs/dist

RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "backend/src/index.js"]
