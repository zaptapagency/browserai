# BrowserAI — Agent-Native Browser Infrastructure SaaS

> A production-grade, multi-tenant SaaS platform for AI agent browser automation (similar to BrowserAct, Browserbase, Steel.dev).

**Status**: ⏸️ **PLANNING PHASE** — Pre-build review in progress. Do not start coding until approved.

---

## 📋 What's Included

This repository contains a **complete pre-build plan** ready for your review:

1. **[PLAN.md](./PLAN.md)** — Comprehensive scope document
   - Core pillars (7 main features)
   - 10 milestones with definition-of-done checkpoints
   - Data model (25+ entities)
   - Service topology and communication patterns
   - Assumptions and open questions
   - Risk mitigation strategies
   - Timeline and resource estimates

2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design and implementation details
   - Monorepo structure (apps/, services/, packages/, infra/)
   - Service topology diagram (API, scheduler, workers, databases)
   - How control plane talks to browser workers (supervisor model)
   - Queue and state machine definitions
   - Detailed request lifecycle example (navigate → click → extract)
   - Action protocol v1.0 (low-token page state, stable indices)
   - Error handling and recovery strategies
   - Security model (RBAC, API keys, validation)
   - Deployment and scaling approach
   - Observability framework (metrics, logging, tracing)

3. **[DEPENDENCIES.md](./DEPENDENCIES.md)** — Third-party services and costs
   - Service matrix (PostgreSQL, Redis, Stripe, Better Auth, Playwright, etc.)
   - MVP cost (~$0 local; ~$180–500/mo in production)
   - Feature flags for risky features (proxies, CAPTCHA solving)
   - Phase-by-phase integration points (M0 through M10)
   - Hardcoded defaults (no external service required for MVP)

4. **[REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md)** — Your review guide
   - Section-by-section approval boxes
   - Open questions to clarify before proceeding
   - Next steps (conditional on approval)
   - Acceptance criteria

---

## 🎯 Quick Start: Review Process

### Step 1: Read the Plan (30 min)

1. Start with [PLAN.md](./PLAN.md)
   - Skim §1–2 (scope interpretation, milestones)
   - Read §3 (data model) carefully
   - Check §4 (service topology) — does it match your vision?
   - Skim §8–9 (open questions, timeline)

2. Then [ARCHITECTURE.md](./ARCHITECTURE.md) (20 min)
   - §1–2 (monorepo layout, service topology diagram)
   - §3 (how workers communicate) — critical to understand
   - §6 (action protocol v1.0) — core product spec
   - §8 (security model)

3. Skim [DEPENDENCIES.md](./DEPENDENCIES.md) (5 min)
   - Service matrix
   - MVP cost
   - Feature flags

### Step 2: Review Checklist (15 min)

Go through [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md):
- Mark boxes that you approve ✅
- Flag any concerns with specificity (e.g., "disagree with BullMQ, prefer Temporal now" or "API should be on port 4000")
- Note questions

### Step 3: Respond

Reply with one of:

**✅ Approved** — "Looks great. Proceed to M0. No changes needed."

**🔄 Revisions** — "Change X to Y because Z. Also, clarify question #3."

**❓ Questions** — "Before approving, I need to understand: how does profile matching work?" (I'll explain + update docs if needed)

---

## 📦 Repo Structure (Pre-M0)

Currently, the repo contains **planning documents only**:

```
browser/
├── README.md                    # This file
├── PLAN.md                      # Scope, milestones, data model
├── ARCHITECTURE.md              # System design, service topology
├── DEPENDENCIES.md              # Third-party services, costs
├── REVIEW_CHECKLIST.md          # Your review guide
└── .git/                        # (git repo, but no code yet)
```

Once you approve, **M0 will scaffold** the monorepo structure:

```
browser/
├── apps/web                     # Next.js dashboard
├── apps/docs                    # Documentation site
├── services/api                 # NestJS control plane
├── services/browser-worker      # Playwright runtime
├── services/scheduler           # BullMQ job processor
├── packages/core                # Shared domain types
├── packages/db                  # Drizzle schema + migrations
├── packages/sdk                 # Published API client
├── packages/cli                 # Published CLI
├── packages/mcp-server          # MCP protocol implementation
├── packages/ui                  # Design system (shadcn/ui)
├── packages/config              # Typed env loader
├── packages/providers           # Proxy + CAPTCHA adapters
├── infra/                       # Docker Compose, Terraform
├── .github/workflows/           # GitHub Actions CI/CD
├── turbo.json                   # Turborepo pipeline
├── pnpm-workspace.yaml          # pnpm configuration
├── tsconfig.json                # TypeScript config
└── package.json                 # Root package
```

---

## 🚀 What Comes After Approval

### Milestone 0 (Foundation) — ~1 week

**Deliverables:**
- Monorepo boots with `pnpm install` ✓
- Docker Compose runs (Postgres, Redis, MinIO) ✓
- Drizzle schema v1 migrates ✓
- Better Auth (email + GitHub OAuth) works ✓
- Health endpoints respond ✓
- GitHub Actions CI is green ✓
- Landing page shell renders ✓

**Checkpoint test:**
```bash
pnpm install
docker-compose up -d
pnpm dev
# Visit http://localhost:3000 → sign up / sign in works
# curl http://localhost:3000/health → {"status":"ok"}
# GitHub Actions shows all checks passing
```

### Milestone 1 (Browser Runtime Core) — ~1.5 weeks

**Deliverables:**
- Browser worker launches isolated Chromium session
- `navigate(url)` action works, returns indexed page state
- Screenshots captured + streamed over WebSocket
- Live view viewer (internal endpoint) shows page + logs
- Page scanner emits compact JSON (elements, interactable indices)
- `click(id)`, `type(id, text)`, `extract(schema)` actions execute
- Session lifecycle + TTL cleanup

### Milestone 2 (Profiles, Proxies, CAPTCHA) — ~1 week

**Deliverables:**
- Three profile modes (rotating, fixed-identity, local-chrome)
- Adapter interfaces for proxy + CAPTCHA providers
- Working mocks (all mocked locally; real providers behind flags)
- Remote-assist link generation (expiring, signed JWT)
- Confirmation gating for sensitive operations
- Cross-tenant isolation proven via tests

### ...and so on, milestone by milestone.

Each milestone **pauses at a checkpoint** for review before proceeding.

---

## 🎨 Design Principles

This plan embodies these core beliefs:

1. **Production-grade from day one** — No stubs, no `// TODO: handle later`, no half-wired features. Every line must be typesafe, tested, validated, and error-handled.

2. **Multi-tenant by design** — Not an afterthought. Security testing is baked in. Cross-tenant isolation is verified in M2.

3. **Security-first, responsible-use** — Bot-detection bypass and CAPTCHA solving are powerful but risky. They're behind feature flags, default to mocks, and users must explicitly opt-in with full audit trails.

4. **Agent-optimized, not user-optimized** — The action protocol is designed for LLM reasoning: low token overhead, stable indices, structured extraction. Humans use the CLI or dashboard; agents use the protocol directly.

5. **Horizontal scaling** — The supervisor model (stateless API + stateful workers) is built to scale. You can add workers without changing the API.

6. **Billing as first-class** — CreditLedger is append-only and is the source of truth. Every action writes audit + usage entries atomically. This prevents billing drift and enables compliance.

---

## 🔧 Tech Stack Summary

| Layer | Choice | Why |
|-------|--------|-----|
| **Monorepo** | pnpm + Turborepo | Fast, manages 15+ packages cleanly |
| **Web** | Next.js 15 + React 19 | App Router, server components, fast |
| **API** | NestJS | Modules, DI, guards, RBAC-friendly |
| **Workers** | Playwright (Chromium) | Industry standard, reliable |
| **Database** | PostgreSQL + Drizzle | Type-safe migrations, reliable |
| **Queue** | Redis + BullMQ | Simple, proven; Temporal upgrade path |
| **Auth** | Better Auth | Self-hosted, OAuth-friendly |
| **Billing** | Stripe | Industry standard, robust |
| **Validation** | Zod | Type-safe at every boundary |
| **Testing** | Vitest + Playwright | Fast, modern, good coverage |
| **CI/CD** | GitHub Actions | Native, zero setup |
| **Observability** | OpenTelemetry + Sentry + Prometheus | Vendor-agnostic, comprehensive |

---

## ❓ Frequently Asked Questions (from the plan)

**Q: Why "agent-native" and not "user-friendly"?**
A: The UI (dashboard, CLI) is user-friendly. But the core protocol is optimized for agents: indexed page state (not raw HTML), structured extraction (JSON schema → typed rows), stable targets (not brittle DOM selectors). This is the core differentiator.

**Q: Why multi-tenant from day one?**
A: Single-tenant would require a redesign later (org queries, RBAC, audit logging). It's cheaper to build correctly now.

**Q: Why Drizzle + Postgres, not Mongo + Firebase?**
A: Relational model maps naturally to the data (users, orgs, sessions, tasks, workflows, billing). Type-safe migrations catch bugs before prod. Firebase isn't cost-effective for this volume.

**Q: Why BullMQ now and Temporal as upgrade path?**
A: BullMQ is simpler and sufficient for MVP. Temporal is for long-running, resumable workflows (future feature). No need for the complexity now.

**Q: Why are proxies and CAPTCHA behind feature flags?**
A: Bot-detection bypass and CAPTCHA solving are legally gray depending on the target site. Defaulting to mocks (no real providers) is responsible. Real providers only when users opt-in explicitly and understand the risks. All sensitive operations are audit-logged.

**Q: What if the user runs out of credits mid-task?**
A: Credit check happens before task starts. If insufficient, returns 402 Payment Required. If task runs out during execution (edge case), task is marked failed, credits refunded (or retried if retries remain + credits granted).

**Q: Can multiple users edit a workflow simultaneously?**
A: Not in MVP. v2 feature (realtime collaboration via WebSockets). MVP is single-user lock.

---

## 📞 Next Steps

1. **Review** the four planning documents (30 min).
2. **Respond** with ✅ (approved), 🔄 (revisions), or ❓ (questions).
3. **I iterate** if needed, or **proceed to M0** if approved.

---

## 📄 License & Contributing

(To be determined after launch.)

---

**Built with ❤️ by Claude Code**

**Last updated**: 2026-07-08
**Status**: ⏸️ Awaiting your review.
