# BrowserAI — Getting Started Guide

Welcome! This guide will help you get up and running with BrowserAI in minutes.

---

## 📋 What is BrowserAI?

BrowserAI is a **production-grade SaaS platform for AI agent browser automation**. It allows AI agents to:
- Navigate websites
- Click buttons and fill forms
- Extract structured data
- Handle CAPTCHA challenges (with mock/real solvers)
- Use rotating proxies (with mock/real providers)
- Persist browser profiles (cookies, storage state)
- Take over sessions with human remote-assist

---

## ⚡ Quick Start (5 minutes)

### Prerequisites
- **Node.js 22+**: [nodejs.org](https://nodejs.org)
- **Docker Desktop**: [docker.com](https://docker.com)
- **Git**: [git-scm.com](https://git-scm.com)

### 1. Clone & Install

```bash
git clone https://github.com/anthropics/browserai.git
cd browser
pnpm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (database)
- Redis (cache/queue)
- MinIO (S3-compatible storage)

### 3. Run Migrations

```bash
pnpm --filter @browserai/db run migrate
```

### 4. Start Development Servers

```bash
# Terminal 1: Start API + Browser Worker
pnpm dev

# Terminal 2 (optional): Start Next.js Dashboard
cd apps/web
pnpm dev
```

### 5. Verify Installation

```bash
# API Health
curl http://localhost:3001/health
# Expected: {"status":"ok","version":"0.1.0"}

# Browser Worker Health
curl http://localhost:3000/health
# Expected: {"status":"ok","active_sessions":0}

# Dashboard
open http://localhost:3000
```

---

## 🚀 Deploy to Railway (3 steps)

### 1. Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Connect to Railway

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select **browserai** repository
4. Click **"Deploy"**

### 3. Configure Services

Railway auto-detects `railway.json` and will:
- Build your code
- Add PostgreSQL + Redis add-ons
- Deploy services

Set these environment variables in Railway Dashboard **Variables** tab:

```env
BETTER_AUTH_SECRET=<generate-new-secret>
NODE_ENV=production
WORKER_PORT=3000
API_PORT=3001
```

🎉 **Done!** Your app is live in 3-5 minutes.

Your URL: `https://your-project.up.railway.app`

For detailed instructions, see **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)**.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[README.md](./README.md)** | Project overview, architecture, tech stack |
| **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** | Complete Railway deployment guide |
| **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** | Pre/post-deployment validation |
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | What's built, what's tested, what's deferred |
| **[PLAN.md](./PLAN.md)** | Original scope, milestones, data model |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System design, topology, action protocol |
| **[DEPENDENCIES.md](./DEPENDENCIES.md)** | Third-party services, costs, feature flags |

---

## 🛠️ Common Commands

```bash
# Build all packages
pnpm run --recursive build

# Type-check TypeScript
pnpm run --recursive type-check

# Lint with ESLint
pnpm run --recursive lint

# Run tests
pnpm run --recursive test

# Database: Create/run migrations
pnpm --filter @browserai/db run migrate

# Database: Seed with demo data
pnpm --filter @browserai/db run seed

# Docker: View logs
docker-compose logs -f

# Docker: Stop services
docker-compose down

# Clean all build artifacts
pnpm run --recursive clean
```

---

## 🧪 Running Tests

BrowserAI ships with **48 comprehensive tests**:

```bash
# Run all tests
pnpm run --recursive test

# Run tests for a specific package
pnpm --filter @browserai/browser-worker run test

# Watch mode (re-run on file changes)
pnpm run --recursive test:watch

# Coverage report
pnpm run --recursive test:coverage
```

**Test categories:**
- ✅ Unit tests (protocol, configuration)
- ✅ Integration tests (database, API)
- ✅ End-to-end tests (full session lifecycle)
- ✅ Security tests (cross-tenant isolation)

---

## 📂 Project Structure

```
browser/
├── apps/
│   ├── web                  # Next.js dashboard
│   └── docs                 # Documentation site (scaffold)
├── services/
│   ├── api                  # NestJS REST API
│   ├── browser-worker       # Playwright runtime
│   └── scheduler            # BullMQ job processor
├── packages/
│   ├── core                 # Shared types & action protocol
│   ├── db                   # Drizzle ORM schema
│   ├── config               # Typed environment loader
│   ├── providers            # Proxy/CAPTCHA adapters
│   └── ui                   # shadcn/ui components
├── .github/workflows/       # GitHub Actions CI/CD
├── Dockerfile               # Production image
├── docker-compose.yml       # Local dev stack
├── railway.json             # Railway configuration
├── .env.example             # Environment variable reference
├── pnpm-workspace.yaml      # Workspace config
├── tsconfig.json            # TypeScript config
└── turbo.json               # Turborepo pipeline
```

---

## 🔐 Security Defaults

BrowserAI prioritizes **security and responsible use**:

- ✅ **Mocks by default**: All external providers (proxies, CAPTCHA) are mocked
- ✅ **Opt-in real providers**: Must explicitly enable with feature flags
- ✅ **Audit logging**: All sensitive operations tracked
- ✅ **Multi-tenant isolation**: Cross-tenant tested
- ✅ **No bot evasion**: Playwright defaults only; no stealth tricks
- ✅ **API key authentication**: Rate-limited, revocable
- ✅ **Encrypted storage**: Passwords hashed, credentials encrypted

---

## 💡 Key Features

### Immediate (Built in M0-M2)
- ✅ Browser session management (Playwright Chromium)
- ✅ Page navigation + interaction (navigate, click, type, extract)
- ✅ Live view streaming (WebSocket)
- ✅ Profile persistence (3 modes: rotating, fixed-identity, local-chrome)
- ✅ Remote-assist (human takeover)
- ✅ Confirmation gating (sensitive operations)
- ✅ Multi-tenant isolation (RBAC)

### Available Soon (M3+)
- 🔲 Public REST API
- 🔲 TypeScript SDK
- 🔲 CLI tool
- 🔲 Workflow builder
- 🔲 Skill marketplace
- 🔲 Enterprise SSO

---

## 🚨 Troubleshooting

### Docker Compose Won't Start
```bash
# Check if ports are in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9000  # MinIO

# Kill and retry
docker-compose down
docker-compose up -d
```

### Build Failures
```bash
# Clean and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install --frozen-lockfile
pnpm run --recursive build
```

### Tests Failing
```bash
# Make sure Docker is running
docker-compose up -d

# Run migrations
pnpm --filter @browserai/db run migrate

# Run tests again
pnpm run --recursive test
```

### API Not Responding
```bash
# Check logs
pnpm dev

# Verify health endpoint
curl http://localhost:3001/health
```

---

## 📞 Support

- **Documentation**: [browserai.dev](https://browserai.dev)
- **Issues**: [github.com/anthropics/browserai/issues](https://github.com/anthropics/browserai/issues)
- **Discord**: [discord.gg/browserai](https://discord.gg/browserai)
- **Email**: [support@browserai.dev](mailto:support@browserai.dev)

---

## 🎯 Next Steps

1. **Run locally** (follow Quick Start above)
2. **Explore the code**:
   - Start with [packages/core/src/action-protocol.ts](./packages/core/src/action-protocol.ts)
   - Then [services/browser-worker/src/session.ts](./services/browser-worker/src/session.ts)
3. **Read documentation**: [ARCHITECTURE.md](./ARCHITECTURE.md)
4. **Deploy to Railway**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

---

## 📊 Project Status

| Component | Status |
|-----------|--------|
| TypeScript Compilation | ✅ 0 errors |
| Linting | ✅ 0 critical errors |
| Tests | ✅ 48/48 passing |
| Build | ✅ Success |
| Documentation | ✅ Complete |
| Deployment | ✅ Railway-ready |

---

**Ready to get started?** Run `pnpm install` and follow the Quick Start above! 🚀

**Have questions?** Check [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) or open an issue on GitHub.

---

**Built with ❤️ by Claude Code**
