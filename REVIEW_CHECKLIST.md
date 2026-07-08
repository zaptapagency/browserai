# Pre-Build Review Checklist

**Status**: ⏸️ **AWAITING REVIEW** — Do not proceed to M0 until you approve this plan.

**Documents Ready**:
- ✅ [PLAN.md](./PLAN.md) — Scope, milestones, data model, 10 checkpoints, risks
- ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, service topology, request lifecycle, action protocol
- ✅ [DEPENDENCIES.md](./DEPENDENCIES.md) — Third-party services, costs, feature flags, phases

---

## Review Checklist (for you)

Please review and approve each section below. Flag any misalignments, and I'll refine before M0.

### Scope & Vision

- [ ] **Core pillars** (browser sessions, identity/isolation, anti-blocking, human-in-the-loop, agent-native runtime, interfaces, workflows, skills, billing, responsible-use) — all match your vision?
- [ ] **Out of scope** (realtime collab, advanced analytics, custom rules, enterprise SSO in v1, affiliate payouts in v1) — acceptable?
- [ ] **MVP definition** (end-to-end web + API + CLI + MCP by M4, workflows by M5, billing by M7) — achievable for your timeline?

### Data Model

- [ ] **Core entities** (User, Org, ApiKey, BrowserProfile, Session, Task, Workflow, Skill, CreditLedger, AuditLog, etc.) — covers your use cases?
- [ ] **Relationships** (org-scoped queries, immutable profiles, audit logging on mutations) — sensible?
- [ ] **CreditLedger as source of truth** — agree this is the right approach for billing?

### Service Topology

- [ ] **Monorepo layout** (apps/, services/, packages/, infra/) — clear and manageable?
- [ ] **NestJS API + BullMQ scheduler + Playwright workers** — right stack for your needs?
- [ ] **Supervisor model** (API assigns sessions to workers; workers are stateful) — matches your architecture thinking?
- [ ] **One browser context per session** (not per-user) — agrees with your isolation model?

### Action Protocol (Core Product)

- [ ] **Page state JSON** (indexed elements, minimal token overhead) — the right abstraction?
- [ ] **Actions** (navigate, click, type, extract, wait, etc.) — sufficient for your use cases?
- [ ] **Confirmation gating** for sensitive ops (proxy, profile import, human steps) — essential?
- [ ] **Semantic memory** (describe profile in natural language, match & reuse) — useful feature?

### Milestones & Timeline

- [ ] **M0–M4** (foundation → browser runtime → profiles → API/SDK/CLI/MCP → dashboard) — reasonable 4-week sprint?
- [ ] **M5–M7** (workflows → skills → billing) — next 3 weeks?
- [ ] **M8–M10** (teams/RBAC/audit → observability/hardening → deploy) — final 3 weeks?
- [ ] **Total ~10 weeks** (full-time) or ~4–6 months (part-time) — does this match your availability?

### Stack Choices

- [ ] **Next.js 15 + React 19** for web — fits your vision?
- [ ] **NestJS** for API — agree on this for RBAC/DI/modularity?
- [ ] **Drizzle ORM** — prefer type-safe migrations?
- [ ] **BullMQ (Redis)** for MVP; **Temporal upgrade path** noted — acceptable?
- [ ] **Better Auth** (email + OAuth) for MVP; **WorkOS for enterprise** (M8+) — okay?
- [ ] **Stripe** for billing; **credit ledger** as single source of truth — correct?
- [ ] **TypeScript strict mode everywhere** — agree on no-compromise policy?

### Security & Compliance

- [ ] **No hardcoded secrets; .env only** — important?
- [ ] **Zod validation on all boundaries** — you expect this rigor?
- [ ] **RBAC guards on every endpoint** — essential?
- [ ] **Per-domain allow/deny lists** + **robots.txt respect by default** — match responsible-use goal?
- [ ] **Audit logging on every mutation** — requirement?
- [ ] **API keys hashed (bcrypt), scoped, rotatable** — good?
- [ ] **Multi-tenant isolation enforced + tested** — must-have?

### Third-Party Services

- [ ] **Stripe (billing)** — ready to integrate in M7?
- [ ] **Better Auth (MVP auth)** — you can set up GitHub/Google OAuth apps?
- [ ] **Proxies & CAPTCHA behind feature flags** (mocked locally, wired on-demand) — right approach?
- [ ] **Sentry (errors, M9+)** — optional but recommended?
- [ ] **OpenTelemetry + Prometheus + Grafana (M9+)** — monitoring stack acceptable?

### Development Experience

- [ ] **One-command local dev** (`pnpm dev` + Docker Compose) — critical?
- [ ] **GitHub Actions CI** (typecheck, lint, test on every PR) — expected?
- [ ] **Seed data + demo mode** — helpful for showcase?
- [ ] **`.env.example` per service + README per package** — documentation standard?

### Definition of Done

- [ ] **Typecheck + lint + tests pass** — non-negotiable?
- [ ] **End-to-end working (UI → API → DB → back)** — every feature?
- [ ] **Loading / empty / error / success states** on UI — UI completeness bar?
- [ ] **Inputs validated, errors handled** — no `// TODO: handle later`?
- [ ] **Audit & usage events** for every mutation — tracking required?

### Risk Mitigation

- [ ] **Graceful browser-crash recovery** + credit refund — handles failure well?
- [ ] **Rate limiting + credit checks** — cost/politeness controls adequate?
- [ ] **Cross-tenant isolation test** — catching bugs is priority?
- [ ] **Billing reconciliation (CreditLedger vs. Stripe)** — nightly audit job?

---

## Open Questions to Resolve

Before M0, please clarify:

1. **Timeline**: Are you aiming for 10 weeks (full-time) or 4–6 months (part-time)?
2. **MVP scope**: Do you want to stop after M4 (API+CLI+MCP) and add workflows/skills/billing later? Or go full M10?
3. **Proxy & CAPTCHA**: Will you wire real providers during MVP, or defer to post-launch? (I recommend defer.)
4. **Observability**: Is M9 (tracing+metrics+hardening) a must-have before launch, or post-launch?
5. **Enterprise tier**: Is WorkOS SSO (M8) needed for launch, or v2 feature?
6. **Skills marketplace**: Is Skill Forge + Hub (M6) in scope for MVP, or post-launch?
7. **Demo mode**: Do you want a pre-recorded workflow (e.g., scrape Amazon bestsellers) for showcase?

---

## Next Steps (Conditional)

### If Approved ✅

1. I proceed to **Milestone 0 (Foundation)**.
2. Work items:
   - Monorepo scaffold (pnpm + Turborepo)
   - TypeScript + ESLint + Prettier strict config
   - Docker Compose (Postgres, Redis, MinIO)
   - Drizzle schema v1 + migrations
   - Better Auth setup (email + GitHub OAuth)
   - Health endpoints
   - Landing page shell
   - CI/CD (GitHub Actions template)
3. Pause after M0 for a real test run:
   - `pnpm install` ✓
   - `docker-compose up -d` ✓
   - `pnpm dev` ✓
   - Sign up / sign in ✓
   - `curl http://localhost:3000/health` ✓
   - CI green on a sample PR ✓

### If Revisions Needed 🔄

1. Specify the changes (scope adjustments, stack swaps, timeline tweaks, etc.).
2. I update PLAN.md / ARCHITECTURE.md / DEPENDENCIES.md.
3. We re-review until approved.

### If Scope Trim Requested ✂️

E.g., "I only need API + CLI + MCP; skip workflows/skills/billing for now":
1. Let me know the target milestone.
2. I adjust the plan (e.g., stop at M4) and trim accordingly.
3. Re-review and proceed.

---

## Review Instructions

**How to review:**

1. **Read PLAN.md** (milestones, data model, assumptions, risks) — 15 min.
2. **Read ARCHITECTURE.md** (system design, service topology, request lifecycle) — 20 min.
3. **Skim DEPENDENCIES.md** (third-party services, costs, phases) — 5 min.
4. **Check this checklist** — mark boxes that are approved; flag concerns.
5. **Reply** with:
   - ✅ Approval (proceed to M0).
   - 🔄 Revisions needed (list specific changes).
   - ❓ Questions (I'll clarify).

---

## Acceptance Criteria (for me, when you approve)

Once you green-light this plan, I commit to:

- ✅ Build a **production-grade** system (typed end-to-end, tested, input-validated, error-handled, observable).
- ✅ **Keep the build green** (no broken commits; CI always passing).
- ✅ **Small, logical commits** with Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, etc.).
- ✅ **Pause at each milestone checkpoint** for review before proceeding (no "just finishing M6" without checkpoint).
- ✅ **Ask before** adding paid deps, making irreversible infra choices, or wiring real proxy/CAPTCHA providers.
- ✅ **Never leave stubs or TODOs** masquerading as features; if something isn't done, it's tracked in a TODO with a milestone.
- ✅ **Provide a checkpoint note** after each ✅ (what was built, how to verify, test results, what's next).

---

## Prepared By

**Claude Code** — Principal Full-Stack Engineer, BrowserAI SaaS Project

**Last Updated**: 2026-07-08

---

**Ready for your review. Please approve, ask questions, or request revisions above.** ⏸️

