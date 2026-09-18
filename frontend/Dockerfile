# Hoopstack frontend — Next.js 16
#
# IMPORTANT: every API call in this app is client-side (react-query inside
# 'use client' components), and Next inlines NEXT_PUBLIC_* at BUILD time. So
# NEXT_PUBLIC_API_URL is a build arg, not a runtime env var, and its value has
# to be reachable from the user's BROWSER — not from inside the compose
# network. http://localhost:8000 (the api service's published port) is correct;
# http://api:8000 would compile in a hostname the browser cannot resolve.

# ── deps ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_API_KEY=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Production dependencies only; typescript, tailwind and eslint are build-time.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN addgroup -g 10001 -S hoopstack && adduser -u 10001 -S hoopstack -G hoopstack
USER hoopstack

EXPOSE 3000

CMD ["npm", "run", "start"]
