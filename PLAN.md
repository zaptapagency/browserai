# Build Plan: BrowserAI — Agent-Native Browser Infrastructure SaaS

**Date**: 2026-07-08
**Status**: Planning Phase — awaiting review before Milestone 0

---

## 1. Scope Interpretation & Core Pillars

### What We Are Building

A **production-grade, multi-tenant SaaS** that abstracts browser automation for AI agents (LLMs + autonomous workflows) with a focus on:

1. **Stealth & Isolation** — launch fresh, fingerprinted browser sessions in isolated containers with zero cross-session state leakage.
2. **Anti-Blocking** — pluggable proxy routing, fingerprint spoofing, TLS/UA rotation, and CAPTCHA solving as adapters (mocks for MVP, real providers behind flags).
3. **Human-in-the-loop failover** — when an agent hits hard friction (2FA, CAPTCHA, mobile-only step), generate a live expiring takeover link for a person to complete it, then hand control back.
4. **Agent-optimized output** — instead of raw DOM, return compact indexed page state, stable action targets, structured extraction, and semantic session memory.
5. **Multi-interface parity** — identical behavior via REST/WebSocket API, published CLI, typed SDK, and MCP server for agents in Claude Code, Cursor, etc.
6. **Workflow orchestration** — visual canvas to compose steps (navigate → click → condition → loop), durable execution, scheduling, and skill reuse.
7. **Responsible use by default** — per-domain allow/deny lists, rate limiting, robots.txt awareness, override flags, and first-class audit trails.

### In Scope for MVP → Launch

- Browser session lifecycle, action protocol, and the three profile modes (rotating, fixed-identity, local Chrome).
- REST + WebSocket API, CLI, SDK, and MCP server.
- Dashboard (sessions, profiles, API keys, usage, org/team settings).
- Workflow builder and durable execution (BullMQ MVP; Temporal upgrade path noted).
- Skills marketplace (author/version/install).
- Stripe billing with credit ledger system, free trial, and invoices.
- Teams, RBAC, audit logging, and essential notifications.
- Observability (OpenTelemetry, Sentry, Prometheus/Grafana), security hardening, and load testing.

### Out of Scope (Post-Launch or Optional)

- Realtime collaboration in the workflow canvas (v2).
- Advanced analytics dashboards beyond usage.
- Custom rule engine for anti-blocking heuristics (advanced tier).
- Enterprise SSO/SAML (flagged for M8+ with WorkOS integration).
- Affiliate program v2 (payouts integration) — tracked but deferred.

---

## 2. Milestone Breakdown (10 milestones, pause at each ✅)

| Milestone | Focus | Definition of Done |
|-----------|-------|-------------------|
| **M0** | Foundation & CI/CD | Monorepo + Docker Compose + Drizzle schema + CI green + auth shell |
| **M1** | Browser runtime | Session lifecycle + navigate + screenshot + live view + page state + actions |
| **M2** | Profiles, proxies, CAPTCHA | Three modes + adapters (all mocked) + remote-assist + confirmation gating |
| **M3** | Public API/SDK/CLI/MCP | REST + keys + rate limiting + typed SDK + CLI + MCP server |
| **M4** | Dashboard | Sessions list + live viewer + artifacts + profiles + API keys + org settings |
| **M5** | Workflows | Canvas + node types + execution engine + history + scheduling |
| **M6** | Skills marketplace | Forge + Hub + install + versioning + reusability |
| **M7** | Billing & credits | Stripe plans + metered usage + CreditLedger + trial + invoices |
| **M8** | Teams, RBAC, audit | Roles enforcement + audit viewer + notifications + settings |
| **M9** | Observability & hardening | Tracing + metrics + logs + security pass + k6 load tests + docs |
| **M10** | Deploy & launch | Terraform/SST infra + staging deploy + runbooks + LAUNCH_CHECKLIST |

---

## 3. Data Model (Core Entities)

### Users & Access

- **User** — email, name, auth provider (email/OAuth), created/updated at. Primary key: `id`.
- **Organization** — name, slug, created/updated at, settings (rate limits, allow/deny domains, etc.). Owner user reference.
- **Membership** — user + org + role (`owner`, `admin`, `member`, `viewer`), created at. Unique on (user_id, org_id).
- **ApiKey** — org-scoped, name, hashed secret (bcrypt), scopes (list of permissions), rate limit override, created/expires at. Unique on `key_hash`. Never store plain text.
- **AuditLog** — org-scoped, actor (user_id or api_key_id), action (string), resource (type + id), change (before/after JSON), IP, user agent, created at. Indexed by org + created at for audit viewers.

### Browser Sessions & Profiles

- **BrowserProfile** — org-scoped, name, mode (`rotating`, `fixed-identity`, `local-chrome`), fingerprint config (all as JSON: device, OS, browser, etc.), proxy binding (reference to ProxyBinding), workspace/cookies path (S3 ref for persisted data), created/updated at, owner user. Immutable once used; versions tracked via JSON field.
- **Session** — org-scoped, profile reference, status (`pending`, `starting`, `active`, `paused`, `closing`, `closed`), workspace ref (S3), live-view token (signed JWT, short-lived), browser PID (when active), started at, closed at, created by (user/API key), audit trail (JSON). Indexed by org + created at.
- **SessionArtifact** — session reference, type (`screenshot`, `har`, `video`, `csv`, `json`, `logs`), S3 path, created at, size bytes.

### Tasks & Workflows

- **Task** — org-scoped, session reference (nullable if multi-session workflow), definition (zod JSON schema of actions), status (`queued`, `running`, `success`, `error`, `cancelled`), result (output JSON or error), created/started/ended at, created by, credit cost (estimated + actual).
- **Workflow** — org-scoped, name, description, canvas definition (React Flow nodes/edges as JSON), validation result (zod schema), created/updated at, created by.
- **WorkflowVersion** — workflow reference, version number, released at (nullable if draft), change log.
- **WorkflowRun** — org-scoped, workflow version reference, status, started/ended at, credit cost, step executions (array of step results), created by, scheduled run reference (nullable).
- **StepExecution** — workflow run reference, step index, step node, status, output, error, duration ms.

### Skills

- **Skill** — org-scoped or published globally, name, description, action protocol definition (zod schema), code/command (language: bash/typescript/python/etc.), tags, created/updated by.
- **SkillVersion** — skill reference, version number, released at, change log.
- **SkillInstall** — org-scoped, skill version reference, installed at, installed by. Tracks which skills are active in an org.

### Proxies & Anti-Blocking

- **ProxyProvider** — name, adapter type (`residential`, `datacenter`, `rotating`, `mock`), credentials (encrypted JSON), config, created at. Global or org-scoped.
- **ProxyBinding** — org-scoped, profile reference (or ad-hoc), proxy provider reference, pool/allocation config, active flag, created at.
- **CaptchaSolveEvent** — session reference, captcha type (`hcaptcha`, `recaptcha_v2`, `recaptcha_v3`, etc.), detected at, solver used (`2captcha`, `deathbycaptcha`, `human`, `mock`), solved at (nullable if timeout), result (token or error), credit cost.

### Remote Assist

- **RemoteAssistSession** — session reference, access token (short, cryptographically signed), created at, expires at, used at (nullable), used by (user reference), handed back flag.

### Billing & Credits

- **Plan** — name (`free`, `pro`, `business`, `enterprise`), monthly_credit_grant, rate limit concurrency, features (JSON array), stripe_product_id.
- **Subscription** — org-scoped, plan reference, status (`trialing`, `active`, `past_due`, `cancelled`), trial_ends_at, billing_cycle_anchor, stripe_subscription_id, created at.
- **CreditLedger** — org-scoped, credit amount (signed: positive for grants, negative for consumption), type (`grant`, `task_execution`, `captcha`, `skill_run`, `monthly_grant`, `bonus`, `refund`), reference (task/session/event id), created at. **Source of truth for credit state.** Indexed by org + created at.
- **UsageEvent** — org-scoped, event type (task, captcha, skill, etc.), reference, credit_deducted, recorded at. For billing reconciliation + analytics.
- **Invoice** — org-scoped, subscription reference, period start/end, total credits consumed, total price USD, stripe_invoice_id, status (`draft`, `issued`, `paid`, `failed`), created/due/paid at.

### Affiliate (MVP = simple tracking, v2 = payouts)

- **AffiliateAccount** — user-scoped, org reference (the product org owning the account), referral_url_token, active flag, created at.
- **Referral** — affiliate account reference, referred org, credited at (when referred org makes first payment or trial signup).

---

## 4. Service Topology & Communication

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  User Interface & Agents                      │
│    (Web Dashboard, CLI, SDK, MCP Server, Third-party AI)     │
└─────────────────────────────────────────────────────────────┘
                           ↓
          ┌────────────────────────────────┐
          │  REST/WebSocket API (NestJS)   │
          │   Auth, org, profiles, tasks   │
          │   Rate limiting, billing       │
          └────────────────────────────────┘
                    ↓            ↓
       ┌────────────────┐  ┌─────────────────┐
       │  PostgreSQL    │  │  Redis          │
       │  (persistent)  │  │  (queue/cache)  │
       └────────────────┘  └─────────────────┘
                    ↓
       ┌────────────────────────────────┐
       │  BullMQ Job Queue (Redis-based)│
       │  Task scheduler, job handler   │
       └────────────────────────────────┘
                    ↓
    ┌──────────────────────────────────────┐
    │  Browser Worker Pool (Playwright)    │
    │  - Isolated containers per session   │
    │  - Action protocol executor          │
    │  - Live view + artifact streaming    │
    └──────────────────────────────────────┘
                    ↓
       ┌────────────────────────────────┐
       │  S3 / MinIO (Object Storage)    │
       │  (screenshots, videos, exports) │
       └────────────────────────────────┘
```

### Services (pnpm workspaces)

**apps/**
- `web`: Next.js 15 (marketing + authenticated dashboard)
- `docs`: Fumadocs docs site

**services/**
- `api`: NestJS control plane (3000 by default)
- `browser-worker`: Playwright runtime (spawns via Docker or local, supervised by API)
- `scheduler`: cron / BullMQ consumer for background jobs

**packages/**
- `sdk`: Typed API client (published to npm)
- `cli`: npx CLI binary (published to npm)
- `mcp-server`: Model Context Protocol server
- `db`: Drizzle schema + migrations + seed helpers
- `core`: Shared domain types, zod schemas, action protocol definitions
- `ui`: shadcn-based component library + Tailwind config
- `providers`: Proxy + CAPTCHA adapters (interfaces + mocks + optional real impls)
- `config`: Typed environment loader, feature flags

**infra/**
- `docker-compose.yml`: Local dev (Postgres, Redis, MinIO, etc.)
- `Terraform` or `SST`: Staging/prod infra

---

## 5. Request Lifecycle for a Browser Task

### Example: "Navigate to Amazon, extract bestsellers, return as JSON"

1. **Client submits task** (REST/CLI/SDK/MCP):
   ```
   POST /api/sessions/{id}/tasks
   {
     "actions": [
       { "type": "navigate", "url": "https://amazon.com" },
       { "type": "wait", "condition": "bestseller_list_visible" },
       { "type": "extract", "schema": { ... } }
     ],
     "profile_id": "prof_xyz"
   }
   ```

2. **API validates & queues**:
   - Lookup org, check permissions, validate schema (zod).
   - Lookup profile, check isolation mode, validate URL against allow/deny list.
   - **Check credits**: estimate cost (base task + actions), confirm balance. If insufficient, return `402 Payment Required`.
   - **Atomic write** to `Task` table (status: `queued`), write `UsageEvent` (estimated).
   - **Enqueue job** to BullMQ with org scope, task ID, and session ID.
   - **Return task ID + live-view token** to client (WebSocket upgrade for live logs/screenshots).

3. **Scheduler consumer picks up job**:
   - Dequeue from BullMQ.
   - Lookup or create a session if needed (browser worker assignment).
   - Pass task to the browser worker via REST/gRPC or in-process module.

4. **Browser worker executes**:
   - Launch or reuse existing Chromium context (based on profile mode).
   - Apply fingerprint config + proxy binding if non-local-chrome.
   - Stream page state (indexed elements) after each nav/wait.
   - For each action:
     - Render indexed page state (JSON).
     - Execute action (click → Playwright click on selector).
     - Capture screenshot (if requested).
     - Stream result + any new elements back to API via WebSocket/gRPC.
   - If CAPTCHA detected → emit `CaptchaSolveEvent`, await solve (adapter → real API or human takeover).
   - If action fails → retry logic (exponential backoff), then fail or escalate.
   - Collect artifacts (screenshots, HAR, logs).

5. **API streams live updates**:
   - Receive worker updates, forward to client (WebSocket).
   - Store artifacts in S3.
   - Update `Session` live-view stream.

6. **Task completes**:
   - Worker sends result (success or error) to API.
   - API updates `Task` status = `success` or `error`, stores result JSON.
   - **Deduct actual credits**: write `CreditLedger` entry (actual consumption), write `UsageEvent` (actual), update `Subscription` balance.
   - **Return result** to client.

7. **Client retrieves result**:
   - REST: `GET /api/tasks/{id}` → result + artifact URLs.
   - WebSocket: auto-pushed to connected clients on task complete.
   - CLI: streams output directly.

---

## 6. Agent-Native Action Protocol (Core Spec)

### Version 1.0

All actions target **stable integer indices** generated from a live page scan, not DOM selectors (which are fragile).

#### Page State Response (Low-Token JSON)

```json
{
  "url": "https://example.com",
  "title": "Example",
  "elements": [
    {
      "id": 0,
      "role": "link",
      "name": "Home",
      "attributes": { "href": "/home" },
      "visible": true,
      "interactable": true
    },
    {
      "id": 1,
      "role": "searchbox",
      "name": "Search",
      "attributes": { "placeholder": "What are you looking for?" },
      "visible": true,
      "interactable": true
    },
    {
      "id": 2,
      "role": "button",
      "name": "Submit",
      "attributes": {},
      "visible": true,
      "interactable": true
    }
  ],
  "memory": {
    "profile_name": "rotating_amazon",
    "session_id": "sess_123",
    "last_action": "navigate",
    "domain": "example.com"
  }
}
```

#### Actions

- **`navigate(url)`** → navigate to URL, return new page state.
- **`click(id)`** → click element by index, return new page state.
- **`type(id, text)`** → type text into element (input/textarea), return new page state.
- **`select(id, value)`** → select option in a select element, return new page state.
- **`wait(condition, timeout_ms)`** → wait for condition (e.g., `element_visible_5`, `text_contains_"checkout"`), return page state or timeout error.
- **`upload(id, file_path)`** → upload file to input, return new page state.
- **`extract(schema)`** → parse page using JSON schema (zod), return structured data (rows/fields). E.g., extract all product cards as `[{title, price, url}, ...]`.
- **`submit(id)`** → find and click closest form's submit button, or use indicated button. Return new page state.

#### Confirmation Gate

Sensitive operations require explicit approval before execution:

```json
{
  "requires_confirmation": true,
  "action": "import_profile",
  "reason": "Importing cookies from untrusted source",
  "details": "Profile 'work_account' will load 42 cookies from example.com",
  "confirm_token": "confirm_xyz123"
}
```

Agent/user must send back:

```json
{
  "confirmation": true,
  "confirm_token": "confirm_xyz123"
}
```

Logged in `AuditLog` with actor ID and timestamp.

#### Semantic Memory

Profiles carry a natural-language description:

```json
{
  "profile_id": "prof_abc",
  "description": "My personal Amazon account, logged in, dark mode enabled, US location",
  "mode": "fixed-identity"
}
```

Agents can call `match_profile(description: string)` → returns matching profiles by description (vector sim + keywords). Useful for "use my work account" without passing the ID.

---

## 7. Third-Party Dependencies & Status

| Service | Category | Status | Usage |
|---------|----------|--------|-------|
| **Stripe** | Billing | Required | Subscription + metered billing |
| **Better Auth** | Authentication | Required (MVP) | Email + OAuth provider (GitHub, Google) |
| **WorkOS** | SSO/SAML | Behind flag (M8) | Enterprise tier auth |
| **2Captcha** | CAPTCHA solving | Behind flag (M2) | Real CAPTCHA solver, mocked locally |
| **DeathByCaptcha** | CAPTCHA solving | Behind flag (M2) | Alternative CAPTCHA solver |
| **Residential Proxy (e.g., Bright Data)** | Proxy routing | Behind flag (M2) | Real proxy provider, mocked locally |
| **Sentry** | Error tracking | Behind flag (M9) | Production error reporting |
| **OpenTelemetry / Grafana** | Observability | Required (M9) | Tracing + metrics |
| **Playwright** | Browser automation | Required | Core runtime (open-source) |
| **PostgreSQL** | Database | Required | Persistent state |
| **Redis** | Cache/queue | Required | BullMQ + rate limits + session cache |
| **MinIO / S3** | Object storage | Required | Screenshots, exports, videos, recordings |

**Default for MVP**: All real providers are **mocked** and disabled by feature flags. Adapters are designed to swap in real providers without code changes (config-driven). Responsible-use controls (allow/deny lists, rate limits, robots respect) are enforced regardless of provider.

---

## 8. Open Questions & Assumptions

1. **Local Chrome mode**: Can users pass a path to an existing Chrome profile (e.g., ~/.config/google-chrome/Default)? **Assumption**: Yes, for MVP. Path is validated and sandboxed.

2. **Workflow persistence**: Do users want to save partial workflows as drafts? **Assumption**: Yes, via `WorkflowVersion` with `released_at` nullable.

3. **Real-time collaboration**: Do multiple users need to edit a workflow simultaneously? **Assumption**: No, for MVP. v2 feature.

4. **Multi-session workflows**: Can a workflow span multiple browser sessions (e.g., log in as user A, log out, log in as user B)? **Assumption**: Yes, via session references in workflow steps. One session per step, but different steps can use different sessions.

5. **Skill marketplace governance**: Who can publish skills? **Assumption**: MVP = org-private skills only. Post-launch = public publishing via review board.

6. **Credit system edge cases**: What happens if a task completes but credit reconciliation fails? **Assumption**: BullMQ retry with exponential backoff; if exhausted, flag for manual audit. `CreditLedger` is append-only — we reconcile against it, not the other way around.

7. **Live-view bandwidth**: Can we assume agents will re-request page state for every action, or cache locally? **Assumption**: Clients cache locally; API returns full state only on first action and then diffs (if desired). MVP = full state always for simplicity.

8. **Session TTL**: Default duration before auto-close? **Assumption**: 1 hour for `rotating` (single-use), 24 hours for `fixed-identity`, infinite for `local-chrome` (until user closes).

9. **Proxy rotation granularity**: Rotate proxy per task, per session, or per action? **Assumption**: Per session in MVP (user chooses at profile creation). Per-action rotation is a post-launch tuning feature.

10. **RBAC scope**: Should a `viewer` role be able to inspect live sessions (logs/artifacts) without executing? **Assumption**: Yes. Roles = `owner` (full), `admin` (all but billing), `member` (create/run tasks + edit own skills), `viewer` (read-only on sessions/tasks).

---

## 9. Non-Functional Requirements (Baked Into Design)

- **Security**: No secrets in code. Hashed API keys (bcrypt). Zod validation on all boundaries. RBAC guards on every endpoint. Rate limiting per API key + per IP. Parameterized queries (Drizzle ORM). OWASP Top 10 hygiene. Audit logging on every mutation.

- **Multi-tenancy**: Every query filtered by org ID. Cross-org query test in test suite. API key scoped to org.

- **Reliability**: Idempotent job handlers (task ID as idempotency key). Retries with exponential backoff (max 3 retries for browser actions, configurable). Dead-letter queue for failed jobs. Graceful browser-crash recovery (session closed, task failed, credit refunded or retried). Session TTL cleanup job (daily cron).

- **UX**: Loading, empty, error, and success states on every UI page. Optimistic updates where safe (e.g., task submission). Keyboard navigation + ARIA for accessibility.

- **DX**: `.env.example` per service. One-command local dev (`pnpm dev` + Docker Compose). README per package. Seed data for demo. Demo mode: pre-recorded tasks against a sandbox Amazon-clone or similar.

- **Cost control**: Credit check before starting expensive ops. Per-domain allow/deny lists. robots.txt respect by default (warning if override). Rate limits per plan (free = 5 concurrent, pro = 20, etc.).

---

## 10. Success Criteria & Checkpoints

### M0 Checkpoint ✅
- [ ] Monorepo boots with `pnpm install` + `pnpm dev`.
- [ ] Docker Compose runs (Postgres, Redis, MinIO).
- [ ] Drizzle schema v1 migrates without error.
- [ ] CI (GitHub Actions) passes on a sample PR (typecheck, lint, test).
- [ ] Sign up + sign in flow works (Better Auth).
- [ ] Health endpoint responsive (`GET /health`).

### M1 Checkpoint ✅
- [ ] Browser worker launches and navigates to a test URL.
- [ ] Live view token works; WebSocket streams page state + screenshots.
- [ ] `click(id)` and `type(id, text)` actions execute and return new page state.
- [ ] Session TTL cleanup job runs and closes expired sessions.
- [ ] e2e test: start session → navigate → click → extract → close.

### M2 Checkpoint ✅
- [ ] All three profile modes work end-to-end (mock proxy/CAPTCHA).
- [ ] Cross-org isolation test: user A cannot read user B's sessions.
- [ ] Remote-assist link generated + takeover works (hand back untested for MVP, but scaffold in place).
- [ ] Confirmation gate blocks and requires approval token.

### M3 Checkpoint ✅
- [ ] REST API authenticated with API key (hashed, scoped).
- [ ] Rate limiting enforced (returns 429 when exceeded).
- [ ] SDK (typed client) published to npm and works via CLI.
- [ ] CLI can `auth login`, `session create`, `action click`, etc.
- [ ] MCP server exposes tools; Claude Code can drive a session via MCP.

### M4 Checkpoint ✅
- [ ] Dashboard: sessions list, live viewer, artifacts download.
- [ ] Profile management CRUD.
- [ ] API key management (create/rotate/revoke).
- [ ] Org settings (name, allow/deny domains, rate limit overrides).

### M5 Checkpoint ✅
- [ ] React Flow canvas loads; drag-drop node creation.
- [ ] Workflow definition zod schema validates and persists.
- [ ] Execution engine runs multi-step workflow; steps appear in history.
- [ ] Scheduling: cron expression saves and BullMQ runs at scheduled time.

### M6 Checkpoint ✅
- [ ] Skill Forge: author + version + test a simple skill.
- [ ] Skill Hub: browse, search, install.
- [ ] Installed skill appears in workflow node picker.

### M7 Checkpoint ✅
- [ ] Stripe subscription plans configured (free, pro, business).
- [ ] Trial period grants 1000 credits; auto-converts to paid after 14 days.
- [ ] Task execution deducts credits; balance updates on dashboard.
- [ ] Invoice generated and visible in org settings.

### M8 Checkpoint ✅
- [ ] Roles enforced: viewer cannot create tasks, admin can invite members.
- [ ] Audit log viewer shows all actions, filtered by date/actor.
- [ ] Email notification on task completion (configurable).

### M9 Checkpoint ✅
- [ ] OpenTelemetry traces exported (locally to Jaeger or similar).
- [ ] Error on task failure creates Sentry issue.
- [ ] Security scan: fuzz API inputs, confirm no XSS/injection.
- [ ] Tenant isolation test passes (data leak test).
- [ ] k6 load test: 100 concurrent sessions, no errors.
- [ ] Docs site live with getting-started + API reference + snippets.

### M10 Checkpoint ✅
- [ ] Terraform config provisions API + worker + DB on staging cloud.
- [ ] Deploy runs successfully; staging env accessible.
- [ ] Backup/restore tested.
- [ ] LAUNCH_CHECKLIST.md signed off.

---

## 11. Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Browser worker crash mid-task → credit loss | Graceful recovery: detect crash, mark task as failed, refund credits, log to audit. |
| API rate limiting too aggressive → user frustration | Configurable limits per plan; UI shows current usage. Free tier defaults to conservative (5 concurrent). |
| Real proxy/CAPTCHA providers have bad uptime | Use mocks for MVP. Real provider behind flag, with fallback to mock. Adapter pattern avoids vendor lock-in. |
| Multi-tenant data leak | Aggressive test: every query should include org filter. Automated check in CI (sqlcheck or similar). |
| Billing reconciliation drift | `CreditLedger` is append-only; audit job nightly compares Stripe usage records to `CreditLedger`. Alerts on mismatch. |
| Session/profile explosion → storage costs | Implement TTL cleanup (1-day default). Alert on S3 size > threshold. User can manually delete old artifacts. |

---

## 12. Timeline & Resource Assumptions

- **Team**: 1 full-stack engineer (you) for MVP to launch.
- **Duration**: M0–M10 in ~12 weeks if working full-time, 4–6 months part-time.
- **Parallel work**: Web + API can develop in parallel after M0; browser worker is mostly serial. Skills/billing can start mid-project.

---

## Next Steps

1. **Review this plan** — do the scope, service topology, and data model align with your vision?
2. **Flag any ambiguities** — I'll refine the assumptions.
3. **Approve architecture** — once you've reviewed ARCHITECTURE.md, we proceed to M0.
4. **Proceed milestone by milestone** — after each ✅, pause for a real test and review before starting the next.

---

**Prepared by**: Claude Code
**Last updated**: 2026-07-08
