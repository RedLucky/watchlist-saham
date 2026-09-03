# ── Stage 0: Common Alpine base ──────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit && \
    npm install --no-save lightningcss-linux-x64-musl && \
    npm cache clean --force

# ── Stage 2: Build the source code ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (produces both native + linux-musl engines)
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PHASE="phase-production-build"
ENV JWT_SECRET="build-phase-static-dummy-secret-not-for-runtime"
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"

RUN npm run build

# ── Stage 3: Minimal Production Runner ───────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl && rm -rf /var/cache/apk/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── Prisma: copy ONLY what's needed at runtime ──────────────────────────────
# 1. Schema file (for db push at startup)
COPY --from=builder /app/prisma ./prisma
# 2. Generated Prisma Client (includes musl query engine)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# 3. All @prisma/* packages (client, engines, debug, config, etc. — CLI needs them all)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# 4. Prisma CLI (for db push at startup)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
# 5. Remove Debian-only engine binaries (not needed on Alpine/musl) — saves ~45 MB
RUN rm -f ./node_modules/@prisma/engines/libquery_engine-debian-* \
          ./node_modules/@prisma/engines/schema-engine-debian-*

# ── Next.js standalone output ────────────────────────────────────────────────
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
