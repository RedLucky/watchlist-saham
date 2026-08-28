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
ENV JWT_SECRET="docker-build-temporary-secret"
ENV DATABASE_URL="postgresql://user:password@localhost:5432/watchlist?schema=public"

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
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
# 3. Prisma CLI (for db push at startup) + its musl query engine
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
# 4. @prisma/engines metadata (package.json + dist for CLI resolution)
COPY --from=builder /app/node_modules/@prisma/engines/package.json ./node_modules/@prisma/engines/package.json
COPY --from=builder /app/node_modules/@prisma/engines/dist ./node_modules/@prisma/engines/dist

# ── Next.js standalone output ────────────────────────────────────────────────
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
