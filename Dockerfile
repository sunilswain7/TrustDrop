# TrustDrop production image for Build with Locus.
# - Listens on PORT 8080 (BWL platform requirement).
# - Health check at /api/health.
# - Migrations apply on container boot before `next start`.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Sharp + pg + ws are runtime deps; we keep all node_modules from build stage.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/instrumentation.ts ./instrumentation.ts

# Ephemeral data dirs — wiped on each container restart.
RUN mkdir -p /data/files /data/previews

EXPOSE 8080

# BWL injects PORT=8080. Migrations first, then the Next.js server on $PORT.
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
