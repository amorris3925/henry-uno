# syntax=docker/dockerfile:1

# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json* ./
RUN npm ci --include=dev 2>/dev/null || npm install

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time env vars needed for Next.js to compile server-side code.
# These get baked into the standalone server bundle.
# Runtime values override via container env vars.
ARG NEXT_PUBLIC_HENRY_API_URL=https://henry.business
ARG NEXT_PUBLIC_PORTAL_URL=https://henry.uno
ENV NEXT_PUBLIC_HENRY_API_URL=$NEXT_PUBLIC_HENRY_API_URL
ENV NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL

RUN npm run build

# Stage 2: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
