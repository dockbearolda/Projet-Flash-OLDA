# syntax=docker/dockerfile:1.7

# ---------- base ----------
FROM node:20-slim AS base
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter @df/api db:generate
RUN pnpm --filter @df/shared build || true
RUN pnpm --filter @df/web build
RUN pnpm --filter @df/api build

# ---------- runner ----------
FROM node:20-slim AS runner
ENV NODE_ENV=production
# chromium + polices : génération du devis PDF côté serveur (puppeteer-core).
# fonts-liberation couvre la pile Helvetica/Arial du gabarit ; dejavu complète les glyphes.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
      chromium fonts-liberation fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/shared ./packages/shared

RUN pnpm install --prod --frozen-lockfile --filter @df/api...
RUN pnpm --filter @df/api db:generate

EXPOSE 3001
# Boot the server FIRST, run the schema sync in the BACKGROUND. A blocking
# `db push` before start was the outage cause: when it hung on a stale DB lock,
# the server never started and the public domain returned 502 ("Application
# failed to respond"). Backgrounding it guarantees the server always listens and
# passes the healthcheck; the push (idempotent) catches up alongside.
CMD ["sh", "-c", "(pnpm --filter @df/api db:deploy || echo '[boot] db:deploy failed') & exec pnpm --filter @df/api start"]
