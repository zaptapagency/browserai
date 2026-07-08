# Getting Started with BrowserAI — Milestone 0

This guide will help you set up and run the BrowserAI platform locally.

## Prerequisites

- **Node.js** 20.11.0 or later
- **pnpm** 9.0.0 or later (`npm install -g pnpm`)
- **Docker & Docker Compose** (for local services: Postgres, Redis, MinIO)
- **Git**

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
cd browser
pnpm install
```

### 2. Start Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432) — database
- Redis (port 6379) — queue & cache
- MinIO (port 9000, 9001) — object storage

Check services are healthy:
```bash
docker-compose ps
docker-compose logs -f postgres redis minio
```

### 3. Setup Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` if needed (most defaults work for local dev).

### 4. Initialize Database

```bash
pnpm db:seed
```

This creates the initial schema and seed data (plans, etc.).

### 5. Start the App

```bash
pnpm dev
```

You should see:
```
🚀 API server running on http://localhost:3000
✅ Browser worker ready
🎯 BrowserAI Scheduler starting...
```

### 6. Verify It Works

Open [http://localhost:3000](http://localhost:3000) in your browser.

- ✅ You should see the landing page.
- ✅ Click "Sign Up" → see demo auth page.
- ✅ Click "Demo: Create Account" → reach dashboard placeholder.

Check API health:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-07-08T...",
  "uptime": 12.3,
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

## Project Structure

**M0 includes:**
- `apps/web` — Next.js 15 (landing page + placeholder auth + dashboard)
- `services/api` — NestJS 10 (REST API, health endpoints)
- `services/scheduler` — BullMQ job processor (placeholder)
- `services/browser-worker` — Playwright worker (placeholder)
- `packages/core` — Shared domain types, action protocol, error definitions
- `packages/config` — Typed environment variables and feature flags
- `packages/db` — Drizzle ORM schema + migrations
- `packages/ui` — shadcn/ui component library (Button example)

## Available Scripts

```bash
# Development
pnpm dev              # Start all services in watch mode

# Building
pnpm build            # Build all packages for production
pnpm type-check       # TypeScript type checking
pnpm lint             # ESLint across all packages
pnpm format           # Prettier format all code

# Database
pnpm db:seed          # Seed initial data (plans, etc.)
pnpm db:migrate       # Run Drizzle migrations

# Cleanup
pnpm clean            # Remove all build artifacts
```

## Monorepo Structure

```
packages/
  core/       → Domain types, action protocol, errors
  config/     → Typed environment variables
  db/         → Drizzle schema & migrations
  ui/         → shadcn/ui components

services/
  api/        → NestJS control plane (REST API)
  scheduler/  → BullMQ job processor
  browser-worker/ → Playwright runtime

apps/
  web/        → Next.js 15 (marketing + dashboard)

infra/
  docker-compose.yml → Local dev services
```

## Troubleshooting

### Port already in use

If port 3000 (web), 5432 (Postgres), or 6379 (Redis) is in use:

```bash
# Change in .env.local
API_PORT=3001
DATABASE_URL="postgresql://dev:dev_password@localhost:5433/browserai_dev"
REDIS_URL="redis://localhost:6380"

# Or kill the process:
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Docker services won't start

```bash
# Check logs
docker-compose logs postgres

# Full cleanup and restart
docker-compose down -v
docker-compose up -d
```

### TypeScript errors

```bash
# Full rebuild
pnpm clean
pnpm install
pnpm build
```

## Next Steps

**M0 Checkpoint ✅** — You're here!

Next milestone (M1): Browser runtime core
- Launch Chromium sessions in Docker
- Implement `navigate`, `click`, `type`, `extract` actions
- Stream live view over WebSocket
- Session lifecycle management

**When ready to proceed**, run the M1 checklist in PLAN.md and we'll build the browser automation layer.

## API Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for:
- Service topology and communication patterns
- Request lifecycle for a browser task
- Action protocol v1.0 specification
- Error handling and recovery strategies

## Security Notes

- **No secrets in code** — all config via `.env.local`
- **Development mode** — auth is mocked (M1+ to wire Better Auth)
- **Database** — default credentials are for dev only (change in production)
- **API keys** — will be hashed with bcrypt (M3+)

## Getting Help

- 📖 [PLAN.md](./PLAN.md) — Full project scope and milestones
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) — System design details
- 📋 [DEPENDENCIES.md](./DEPENDENCIES.md) — Third-party services and costs
- 💬 Issues & discussions (when the repo is public)

---

**Status**: ⏸️ Milestone 0 complete. Awaiting review and sign-off before M1.

**Built with**: pnpm + Turborepo + TypeScript + NestJS + Next.js + Playwright + Drizzle
