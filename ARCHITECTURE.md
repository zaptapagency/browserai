# Architecture: BrowserAI SaaS Platform

**Version**: 1.0
**Date**: 2026-07-08

---

## 1. Monorepo Structure & Purpose

```
browserai/
├── apps/
│   ├── web/                    # Next.js 15 (App Router) — marketing + dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (marketing)/  # Public landing, pricing, docs links
│   │   │   │   ├── (auth)/       # Auth pages (login, signup, callback)
│   │   │   │   └── (app)/        # Authenticated dashboard + workspaces
│   │   │   ├── components/       # Page-specific + shared UI
│   │   │   └── lib/              # Client utilities, hooks, API client
│   │   ├── public/               # Static assets
│   │   └── package.json
│   └── docs/                    # Fumadocs — versioned documentation
│       ├── content/
│       └── app/
│
├── services/
│   ├── api/                     # NestJS control plane (port 3000)
│   │   ├── src/
│   │   │   ├── modules/         # Feature modules (auth, orgs, sessions, tasks, etc.)
│   │   │   │   ├── auth/
│   │   │   │   ├── orgs/
│   │   │   │   ├── sessions/
│   │   │   │   ├── tasks/
│   │   │   │   ├── workflows/
│   │   │   │   ├── profiles/
│   │   │   │   ├── billing/
│   │   │   │   └── audit/
│   │   │   ├── common/          # Guards, filters, decorators, types
│   │   │   ├── integrations/    # Stripe, Better Auth, S3, Redis
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   ├── browser-worker/          # Playwright + session runtime (runs in containers)
│   │   ├── src/
│   │   │   ├── session.ts       # Session lifecycle, state machine
│   │   │   ├── action-executor.ts # Click, type, navigate, extract logic
│   │   │   ├── page-scanner.ts  # Index page elements, emit page state JSON
│   │   │   ├── fingerprint.ts   # Apply fingerprint config (UA, device, etc.)
│   │   │   ├── proxy-client.ts  # Proxy provider adapter client
│   │   │   ├── captcha-handler.ts # Detect + emit CAPTCHA events
│   │   │   ├── websocket-server.ts # Live view + log streaming
│   │   │   ├── artifact-manager.ts # Screenshots, HAR, video to S3
│   │   │   └── main.ts          # Worker entry, health check
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── scheduler/               # BullMQ consumer + cron jobs (port 3001)
│       ├── src/
│       │   ├── processors/      # Task runner, cleanup, usage reconciliation
│       │   ├── jobs/
│       │   └── main.ts
│       └── package.json
│
├── packages/
│   ├── core/                    # Shared domain layer
│   │   ├── src/
│   │   │   ├── types/           # User, Org, Session, Task, etc.
│   │   │   ├── schemas/         # Zod schemas (action protocol, workflow, etc.)
│   │   │   ├── action-protocol.ts # Version 1.0 protocol spec
│   │   │   ├── errors.ts        # Custom error types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── db/                      # Drizzle ORM + migrations
│   │   ├── src/
│   │   │   ├── schema/          # Table definitions (users, orgs, sessions, etc.)
│   │   │   ├── migrations/      # SQL migration files
│   │   │   ├── seed.ts          # Dev seed data
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── ui/                      # shadcn/ui + design tokens
│   │   ├── src/
│   │   │   ├── components/      # Button, Input, Card, Dialog, etc.
│   │   │   ├── hooks/           # useMediaQuery, useToast, etc.
│   │   │   ├── lib/             # classnames, cn(), utilities
│   │   │   └── styles/          # Tailwind config, theme
│   │   └── package.json
│   │
│   ├── config/                  # Typed env loader + feature flags
│   │   ├── src/
│   │   │   ├── env.ts           # Zod schema for process.env, with defaults
│   │   │   ├── features.ts      # Feature flags (enable_real_captcha, etc.)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── providers/               # Adapter interfaces + implementations
│   │   ├── src/
│   │   │   ├── proxy/
│   │   │   │   ├── interface.ts # ProxyAdapter abstract interface
│   │   │   │   ├── mock.ts      # Mock implementation (returns localhost)
│   │   │   │   ├── brightdata.ts # Real impl (feature-flagged)
│   │   │   │   └── index.ts
│   │   │   ├── captcha/
│   │   │   │   ├── interface.ts # CaptchaAdapter abstract interface
│   │   │   │   ├── mock.ts      # Mock solver
│   │   │   │   ├── 2captcha.ts  # Real impl (feature-flagged)
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── sdk/                     # Published API client (to npm)
│   │   ├── src/
│   │   │   ├── client.ts        # HTTP + WebSocket client
│   │   │   ├── auth.ts          # API key handling
│   │   │   ├── sessions.ts      # Session CRUD + actions
│   │   │   ├── profiles.ts      # Profile management
│   │   │   ├── tasks.ts         # Task submission + polling
│   │   │   ├── workflows.ts     # Workflow execution
│   │   │   ├── types.ts         # TypeScript types mirroring API
│   │   │   └── index.ts
│   │   ├── README.md
│   │   └── package.json
│   │
│   ├── cli/                     # Published CLI (to npm as `browserai`)
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── auth.ts      # login, logout, whoami
│   │   │   │   ├── session.ts   # create, list, close, action
│   │   │   │   ├── profile.ts   # create, list, update
│   │   │   │   ├── task.ts      # run, logs, result
│   │   │   │   ├── skill.ts     # install, list, remove
│   │   │   │   └── config.ts    # set, get, reset
│   │   │   ├── lib/
│   │   │   │   ├── client.ts    # SDK wrapper
│   │   │   │   ├── config.ts    # Load ~/.browserai/config.json
│   │   │   │   └── output.ts    # Formatting, progress bars
│   │   │   └── index.ts         # CLI entry point (oclif)
│   │   ├── bin/cli.js
│   │   ├── README.md
│   │   └── package.json
│   │
│   └── mcp-server/              # MCP (Model Context Protocol) server
│       ├── src/
│       │   ├── resources.ts     # MCP resource definitions
│       │   ├── tools.ts         # MCP tool definitions (start_session, click, etc.)
│       │   ├── client.ts        # BrowserAI SDK client wrapper
│       │   └── index.ts         # MCP server entry
│       ├── README.md
│       └── package.json
│
├── infra/
│   ├── docker-compose.yml       # Local dev: Postgres, Redis, MinIO, etc.
│   ├── docker-compose.prod.yml  # Reference for prod setup
│   ├── Dockerfile.api
│   ├── Dockerfile.browser-worker
│   ├── Dockerfile.scheduler
│   ├── terraform/               # Prod infra (or SST if preferred)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── k8s/                     # Optional: Kubernetes manifests
│   └── README.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml               # typecheck, lint, test, build
│       └── deploy.yml           # Deploy to staging
│
├── .env.example                 # Example env for all services combined
├── turbo.json                   # Turborepo pipeline config
├── tsconfig.json                # Root TypeScript config
├── package.json                 # pnpm workspaces + shared scripts
├── pnpm-workspace.yaml
├── PLAN.md                      # (This document: scope, milestones, data model)
├── ARCHITECTURE.md              # (This document: system design + service topology)
└── README.md                    # Getting started guide
```

---

## 2. Service Topology

### System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         EXTERNAL CLIENTS                         │
│  (Web Browser, CLI, SDK, MCP Server, Third-party AI Agent)      │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│                   LOAD BALANCER / API GATEWAY                    │
│                    (Vercel / Cloud LB)                           │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ├─────────────────────────────────────────┐
             │                                         │
             ▼                                         ▼
     ┌──────────────────┐                  ┌──────────────────┐
     │   Next.js Web    │                  │  NestJS API      │
     │   (Vercel)       │                  │  (Port 3000)     │
     │                  │                  │                  │
     │ • Marketing      │                  │ • Auth (Better)  │
     │ • Dashboard      │                  │ • Orgs/teams     │
     │ • Live viewer    │                  │ • Sessions (CRUD)│
     │                  │                  │ • Tasks (submit) │
     └──────────────────┘                  │ • Workflows      │
                                           │ • Profiles       │
                                           │ • Billing        │
                                           │ • Audit logs     │
                                           │ • Health check   │
                                           └────────┬─────────┘
                                                    │
                 ┌──────────────────────────────────┼──────────────────────────┐
                 │                                  │                          │
                 ▼                                  ▼                          ▼
        ┌──────────────────┐           ┌──────────────────┐      ┌──────────────────┐
        │   PostgreSQL     │           │     Redis        │      │    MinIO / S3    │
        │   (Primary DB)   │           │  (Cache/Queue)   │      │ (Object Storage) │
        │                  │           │                  │      │                  │
        │ • Users          │           │ • Job queue      │      │ • Screenshots    │
        │ • Orgs           │           │ • Rate limits    │      │ • Videos         │
        │ • Sessions       │           │ • Live view      │      │ • HAR files      │
        │ • Tasks          │           │ • Session cache  │      │ • Exports        │
        │ • Workflows      │           │                  │      │                  │
        │ • Billing        │           └──────────────────┘      └──────────────────┘
        │ • Audit logs     │
        │ • Skills         │
        └──────────────────┘
                 ▲
                 │
                 └────────────────────────────┐
                                              │
                                              ▼
                                    ┌──────────────────────┐
                                    │  BullMQ Scheduler    │
                                    │  (Port 3001)         │
                                    │                      │
                                    │ • Task consumer      │
                                    │ • Workflow executor  │
                                    │ • Session cleanup    │
                                    │ • Usage reconcile    │
                                    └──────────────────────┘
                                              │
                 ┌────────────────────────────┴────────────────────┐
                 │                                                  │
                 ▼                                                  ▼
        ┌────────────────────┐                              ┌────────────────────┐
        │ Browser Worker     │ ◄───── Assigned by ────► │ Browser Worker     │
        │  Pool (Docker)     │      Scheduler / API      │  Pool (Docker)     │
        │                    │                              │                    │
        │ • Playwright       │                              │ • Playwright       │
        │ • Session #1       │                              │ • Session #3       │
        │ • Session #2       │                              │ • Session #4       │
        │ • Action executor  │                              │ • Action executor  │
        │ • Live WS stream   │                              │ • Live WS stream   │
        │ • Page scanner     │                              │ • Page scanner     │
        │ • Artifact mgmt    │                              │ • Artifact mgmt    │
        └────────────────────┘                              └────────────────────┘
                 │                                                  │
                 └─────────────────────┬──────────────────────────┘
                                       │
                                       ▼
                            ┌────────────────────┐
                            │  External Services │
                            │  (Feature-flagged) │
                            │                    │
                            │ • Stripe (billing) │
                            │ • Better Auth      │
                            │ • Proxy providers  │
                            │ • CAPTCHA solvers  │
                            │ • Sentry (errors)  │
                            │ • OpenTelemetry    │
                            └────────────────────┘
```

### Service Responsibilities

| Service | Port | Purpose | Scaling |
|---------|------|---------|---------|
| **web (Next.js)** | 3000 (SSR) | Marketing + dashboard UI | Vercel auto-scaling |
| **api (NestJS)** | 3000 | REST + WebSocket API, control plane | Horizontal (stateless) |
| **scheduler (Node)** | 3001 | BullMQ consumer, cron jobs | Single instance (process queue) |
| **browser-worker** | — | Playwright runtime in Docker | Per-session container (supervisor assigns) |
| **PostgreSQL** | 5432 | Persistent state | Managed (RDS/Aurora recommended) |
| **Redis** | 6379 | Queue + cache | Managed (ElastiCache/Redis Enterprise) |
| **MinIO / S3** | 9000 (MinIO) | Object storage | Managed (S3 / MinIO in prod) |

---

## 3. How the Control Plane Talks to Browser Workers

### Communication Pattern: Supervisor Model

The **API** acts as a **supervisor** that assigns sessions to worker instances. Workers are **stateful** (hold browser contexts); the API is **stateless**.

#### Session Lifecycle & Assignment

1. **Session creation** (API endpoint `/sessions`):
   - Validate org, profile, permissions.
   - Create `Session` row in DB (status: `pending`).
   - **Enqueue job** `CreateSessionJob` in Redis (BullMQ).

2. **Scheduler picks up job**:
   - Find an idle browser-worker instance (via heartbeat registry in Redis).
   - Send HTTP POST to worker: `POST http://worker-host:8080/internal/sessions`
   - Payload:
     ```json
     {
       "session_id": "sess_123",
       "org_id": "org_456",
       "profile_id": "prof_789",
       "profile_mode": "rotating",
       "fingerprint_config": { ... },
       "proxy_binding": { ... }
     }
     ```
   - Worker launches Chromium context, returns:
     ```json
     {
       "session_id": "sess_123",
       "worker_host": "worker-1.internal:8080",
       "worker_pid": 4521,
       "ws_token": "signed_jwt_token_with_exp"
     }
     ```

3. **API stores assignment**:
   - Update `Session` table: `worker_host`, `worker_ws_token`, status = `active`.
   - Return to client: `session_id`, `worker_ws_token`.

4. **Client connects to WebSocket**:
   - `WebSocket ws://worker-1.internal:8080/sessions/{session_id}/stream?token={ws_token}`
   - Worker validates JWT (org_id, session_id, exp).
   - Worker begins streaming: page state, screenshots, logs.

#### Task Execution via Worker

1. **Client submits task** (REST): `POST /api/sessions/{session_id}/tasks`
   - API validates, enqueues `ExecuteTaskJob`.

2. **Scheduler dispatches to worker**:
   - HTTP POST: `POST http://worker-host:8080/internal/tasks`
   - Payload: `{ session_id, task_id, actions: [...] }`
   - Worker executes actions sequentially (navigate → click → type → extract).
   - Streams updates back to API via gRPC or HTTP polling (return result in POST response).

3. **API relays to client**:
   - Updates `Task` status in DB.
   - Forwards results to WebSocket client (if connected).
   - Stores artifacts in S3.

#### Worker Health & Failover

- **Heartbeat**: Each worker sends heartbeat to Redis every 5 seconds (`SET key:worker:host:pid:heartbeat value EX 10`).
- **Scheduler monitors**: Heartbeat TTL expires → worker considered dead, sessions reassigned.
- **Graceful shutdown**: Worker drains queue before exit (SIGTERM → close browser contexts → exit).

### Isolated Docker Containers (Per-Session)

Alternative to shared-process workers (used if horizontal scale needed):

- **Scheduler** assigns session to a **container pool**.
- Spins up new container: `docker run browserai/browser-worker --session-id=sess_123`
- Container runs one session to completion, then exits.
- Reduces noisy-neighbor risk; higher overhead per session.

**MVP decision**: Shared-process workers with context pooling (simpler, lower overhead for dev).

---

## 4. Queue & State Model (BullMQ)

### Job Types

| Job | Priority | Retries | Timeout | Handler |
|-----|----------|---------|---------|---------|
| **CreateSessionJob** | high | 2 | 30s | Assign worker, launch browser |
| **ExecuteTaskJob** | high | 3 | 5m | Run actions, stream results |
| **WorkflowRunJob** | normal | 2 | 30m | Execute workflow steps serially |
| **SkillInstallJob** | low | 1 | 10s | Download + verify skill code |
| **SessionCleanupJob** | low | 0 | 5m | Close expired sessions, cleanup artifacts |
| **UsageReconcileJob** | low | 1 | 10m | Reconcile credits against Stripe usage records |
| **ScreenshotUploadJob** | normal | 2 | 2m | Upload screenshot to S3, update artifact ref |

### State Machines

#### Session State Machine

```
pending
  ↓ (worker assigned)
starting
  ↓ (browser launched)
active
  ↓
  ├→ paused (manual pause)
  │   ↓ (resume)
  │   → active
  │
  └→ closing (TTL or user request)
      ↓
      closed (cleanup done)
```

#### Task State Machine

```
queued
  ↓ (dequeued)
running
  ↓
  ├→ success (all actions completed)
  ├→ error (action failed, retries exhausted)
  └→ cancelled (user cancelled)
```

#### Workflow State Machine

```
draft
  ↓ (publish)
released
  ↓ (schedule)
scheduled
  ↓ (time triggers)
running
  ↓
  ├→ success (all steps passed)
  ├→ error (step failed)
  └→ paused (manual intervention)
```

---

## 5. Request Lifecycle: Detailed Example

### Use Case: "Navigate Amazon → Click 'Bestsellers' → Extract Products"

#### Step 1: Client Submits Session + Task

```
POST /api/sessions HTTP/1.1
Authorization: Bearer $API_KEY
Content-Type: application/json

{
  "profile_id": "prof_rotating_1",
  "name": "Amazon bestsellers scrape",
  "tags": ["demo"]
}

Response (201):
{
  "session_id": "sess_abc123",
  "status": "starting",
  "ws_token": "eyJhbGc...",
  "worker_host": null  (not assigned yet)
}
```

#### Step 2: Client Connects to WebSocket (while session starts)

```
WebSocket ws://api.browserai.io/sessions/sess_abc123/stream
Query: ?token=eyJhbGc...

Server sends:
{ "type": "session_status", "data": { "status": "starting" } }
{ "type": "log", "data": "Launching Chromium..." }
{ "type": "log", "data": "Session ready." }
{ "type": "session_status", "data": { "status": "active", "worker_host": "worker-1:8080" } }
```

#### Step 3: Scheduler Creates Session in Worker

```
Scheduler dequeues CreateSessionJob:
  POST http://worker-1:8080/internal/sessions HTTP/1.1
  Content-Type: application/json

  {
    "session_id": "sess_abc123",
    "org_id": "org_xyz",
    "profile_id": "prof_rotating_1",
    "profile_config": {
      "mode": "rotating",
      "fingerprint": { "user_agent": "Mozilla/5.0 ...", "device": "desktop" },
      "proxy_binding": { "provider": "mock", "pool": "rotating" }
    }
  }

Worker response (200):
  {
    "session_id": "sess_abc123",
    "browser_pid": 12345,
    "ready": true
  }

Scheduler updates DB:
  UPDATE sessions SET status='active', worker_host='worker-1:8080', worker_pid=12345 WHERE id='sess_abc123'
```

#### Step 4: Client Submits Task

```
POST /api/sessions/sess_abc123/tasks HTTP/1.1
Authorization: Bearer $API_KEY
Content-Type: application/json

{
  "actions": [
    { "type": "navigate", "url": "https://amazon.com" },
    { "type": "wait", "condition": "text_contains_Bestsellers", "timeout_ms": 5000 },
    { "type": "click", "id": 5 },
    { "type": "wait", "condition": "page_load", "timeout_ms": 3000 },
    {
      "type": "extract",
      "schema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "price": { "type": "string" },
            "rating": { "type": "number" }
          }
        }
      }
    }
  ]
}

Response (202):
{
  "task_id": "task_def456",
  "status": "queued",
  "credit_estimate": 50,
  "confirmation_required": false
}
```

#### Step 5: API Validation & Queueing

```
API logic:
  1. Lookup session (org_id, user_id) — verify access
  2. Validate URL against org's allow_list
  3. Estimate credits: base (10) + navigate (5) + wait×2 (2) + click (5) + extract (20) = 42 credits
  4. Check org credit balance: 1000 > 42 ✓
  5. Create Task row: status='queued', credit_estimate=42
  6. Create UsageEvent: org_id, event_type='task_estimated', credit_deducted=-42 (hold)
  7. Enqueue ExecuteTaskJob to BullMQ: { session_id, task_id, actions }
```

#### Step 6: Scheduler Dispatches to Worker

```
Scheduler dequeues ExecuteTaskJob:
  POST http://worker-1:8080/internal/tasks HTTP/1.1

  {
    "session_id": "sess_abc123",
    "task_id": "task_def456",
    "actions": [...]
  }

Worker begins execution:
  Action 1: navigate("https://amazon.com")
    → Launch navigation, capture screenshot
    → Emit page state (indexed elements, 8 items found)
    → Stream to API: { "type": "action_complete", "action": 0, "page_state": {...} }

  Action 2: wait("text_contains_Bestsellers", 5000)
    → Poll DOM for text match, retry 50 times over 5s
    → Found! Emit new page state (now 12 items: original + Bestsellers link visible)
    → Stream to API: { "type": "action_complete", "action": 1, "page_state": {...} }

  Action 3: click(5)
    → Look up element with id=5 in current page state
    → Click via Playwright: page.click('selector_from_id_5')
    → New page load (navigation triggered)
    → Emit new page state: bestsellers page loaded, 50 product cards visible
    → Stream: { "type": "action_complete", "action": 2, "page_state": {...} }

  Action 4: wait("page_load", 3000)
    → Wait for network idle
    → Emit: { "type": "action_complete", "action": 3, "page_state": {...} }

  Action 5: extract(schema)
    → Parse page state, extract all elements matching schema
    → Return:
      [
        { "title": "Product A", "price": "$19.99", "rating": 4.5 },
        { "title": "Product B", "price": "$24.99", "rating": 4.8 },
        ...
      ]
    → Stream: { "type": "action_complete", "action": 4, "result": [...] }

  Task complete:
    → Return to scheduler: { "status": "success", "result": [...], "duration_ms": 3421 }
```

#### Step 7: API Completes Task & Billing

```
Scheduler receives result:
  1. Lookup Task: task_id='task_def456'
  2. Calculate actual credits: 10 + 5 + 2 + 2 + 5 + 20 = 44 (2 more than estimate due to retries)
  3. Update Task: status='success', result=JSON, credit_actual=44, ended_at=now()
  4. Write CreditLedger: org_id, amount=-44, type='task_execution', reference='task_def456'
  5. Update Subscription: credits_remaining = 1000 - 44 = 956
  6. Update UsageEvent: actual_credit_deducted=44 (replace hold)
  7. Upload artifacts to S3 (screenshots, etc.)
  8. Push to API: Task complete, client receives result via WebSocket
```

#### Step 8: Client Receives Result

```
WebSocket stream:
  { "type": "action_complete", "action": 5, "result": [...], "status": "success" }
  { "type": "task_complete", "data": { "task_id": "task_def456", "status": "success" } }
  { "type": "artifact", "data": { "type": "screenshot", "url": "s3://..." } }

Client disconnects or continues with more tasks on same session.
```

#### Step 9: Session Cleanup (after TTL)

```
Scheduler runs SessionCleanupJob every hour:
  1. Query sessions WHERE status='active' AND created_at < (now - 1 hour)
  2. For each expired session:
     a. Send DELETE http://worker-1:8080/internal/sessions/sess_abc123
     b. Worker closes browser context, frees resources
     c. Update Session: status='closed', closed_at=now()
     d. Delete S3 artifacts (or archive to cold storage)
     e. Log to AuditLog: "Session closed by TTL"
```

---

## 6. Action Protocol (Version 1.0)

### Page State JSON (Low-Token Optimized)

```json
{
  "protocol_version": "1.0",
  "url": "https://amazon.com/best-sellers",
  "title": "Amazon Best Sellers",
  "viewport": { "width": 1280, "height": 720 },
  "elements": [
    {
      "id": 0,
      "role": "heading",
      "name": "Best Sellers",
      "visible": true,
      "interactable": false,
      "rect": { "x": 100, "y": 50, "width": 500, "height": 40 }
    },
    {
      "id": 1,
      "role": "link",
      "name": "Home",
      "attributes": { "href": "/" },
      "visible": true,
      "interactable": true,
      "rect": { "x": 10, "y": 10, "width": 80, "height": 30 }
    },
    {
      "id": 2,
      "role": "button",
      "name": "Sign In",
      "attributes": { "aria-label": "Sign in to your account" },
      "visible": true,
      "interactable": true,
      "rect": { "x": 1200, "y": 10, "width": 70, "height": 30 }
    },
    {
      "id": 3,
      "role": "searchbox",
      "name": "Search Amazon",
      "attributes": { "placeholder": "Search Amazon" },
      "visible": true,
      "interactable": true,
      "rect": { "x": 400, "y": 10, "width": 400, "height": 40 }
    }
  ],
  "interactable_count": 3,
  "memory": {
    "session_id": "sess_abc123",
    "profile_name": "rotating_1",
    "last_action": "navigate",
    "action_count": 1,
    "elapsed_ms": 2341
  }
}
```

### Action Definitions

#### `navigate(url: string)`
- **Input**: `{ "type": "navigate", "url": "https://example.com" }`
- **Behavior**: Navigate to URL, wait for page load (network idle).
- **Output**: New page state JSON.
- **Credit cost**: 5
- **Errors**: Invalid URL, timeout (>30s), network error (logged, retried).

#### `click(id: number)`
- **Input**: `{ "type": "click", "id": 5 }`
- **Behavior**: Click element by index, wait for page to stabilize.
- **Output**: New page state (may trigger navigation).
- **Credit cost**: 5
- **Errors**: Element not found, element not interactable, click timeout.

#### `type(id: number, text: string)`
- **Input**: `{ "type": "type", "id": 10, "text": "hello world" }`
- **Behavior**: Focus element, clear if needed, type text, emit change events.
- **Output**: New page state (may trigger validation/form changes).
- **Credit cost**: 3
- **Errors**: Element not input/textarea, type timeout.

#### `select(id: number, value: string)`
- **Input**: `{ "type": "select", "id": 12, "value": "option_1" }`
- **Behavior**: Select option in select element, trigger change event.
- **Output**: New page state.
- **Credit cost**: 3
- **Errors**: Element not select, option not found.

#### `wait(condition: string, timeout_ms: number)`
- **Input**: `{ "type": "wait", "condition": "text_contains_Submit", "timeout_ms": 5000 }`
- **Condition syntax** (expandable):
  - `text_contains_X`: Wait for page to contain text "X".
  - `element_visible_ID`: Wait for element with ID to be visible.
  - `element_gone_ID`: Wait for element with ID to disappear.
  - `page_load`: Wait for network idle.
  - `url_matches_PATTERN`: Wait for URL to match regex pattern.
- **Output**: New page state or timeout error.
- **Credit cost**: 2 per check (up to 50 checks).
- **Errors**: Timeout, condition syntax error.

#### `upload(id: number, file_path: string)`
- **Input**: `{ "type": "upload", "id": 20, "file_path": "/tmp/resume.pdf" }`
- **Behavior**: Set file input's files, trigger change/input events.
- **Output**: New page state.
- **Credit cost**: 10
- **Errors**: Element not file input, file not readable, upload timeout.

#### `extract(schema: ZodSchema)`
- **Input**:
  ```json
  {
    "type": "extract",
    "schema": {
      "type": "object",
      "properties": {
        "products": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": { "type": "string" },
              "price": { "type": "string" },
              "rating": { "type": "number" }
            },
            "required": ["title", "price"]
          }
        }
      }
    }
  }
  ```
- **Behavior**: Parse current page state + DOM, extract structured data per schema. Return rows (array) or object.
- **Output**: Structured JSON matching schema.
- **Credit cost**: 20 (base) + 5 per item extracted (up to 100 items free).
- **Errors**: Schema validation failed, extraction failed (returns partial results with warnings).

#### `submit(id?: number)`
- **Input**: `{ "type": "submit", "id": 15 }`
- **Behavior**: If `id` provided, click that button. Else, find closest form's submit button and click.
- **Output**: New page state (may trigger navigation).
- **Credit cost**: 5
- **Errors**: No form found, button not found, submit timeout.

### Confirmation Gate

Sensitive operations require explicit approval:

```json
{
  "requires_confirmation": true,
  "action_type": "import_profile",
  "reason": "Importing cookies from untrusted source",
  "details": {
    "cookies_count": 42,
    "domains": ["amazon.com", "example.com"],
    "profile_name": "work_account"
  },
  "confirm_token": "confirm_xyz123",
  "expires_at": "2026-07-08T12:05:00Z"
}
```

Client must send:

```json
{
  "action_type": "confirm",
  "confirm_token": "confirm_xyz123",
  "confirmed": true
}
```

Logged in `AuditLog`: actor ID, action, confirm token, approval timestamp.

---

## 7. Error Handling & Recovery

### Graceful Degradation

| Scenario | Behavior | Recovery |
|----------|----------|----------|
| Browser crashes mid-task | Detect via heartbeat loss, mark session closed | Retry task in new session (if credits allow + retries remain) |
| Network timeout on action | Retry with exponential backoff (100ms, 200ms, 400ms) | After 3 retries, fail task; log for manual review |
| CAPTCHA detected | Emit `CaptchaSolveEvent`, pause task | Await solver (real adapter or human takeover link) |
| Proxy IP blocked | Switch to next IP in pool (or use fallback direct) | Log event for monitoring; alert if frequent |
| Session TTL exceeded | Close context, mark session expired | Return 410 Gone to client; client must create new session |
| Credit insufficient | Reject task submission with 402 Payment Required | Return to client; user must upgrade or wait for grant |

### Retry Logic

- **Task action** fails: Retry up to 3 times (exponential backoff: 100ms, 200ms, 400ms). If all fail, mark task failed.
- **Job** (CreateSessionJob, ExecuteTaskJob, etc.) fails: Retry per BullMQ config (3× for high-priority, 1× for low). If exhausted, dead-letter queue for manual review.
- **Transient DB errors**: Retry with backoff (handled by Drizzle connection pool).

---

## 8. Security Model

### API Authentication & Authorization

```
Request: GET /api/sessions
Header: Authorization: Bearer sk_abc123

API logic:
  1. Hash(sk_abc123) → hash_abc
  2. Query ApiKey table: WHERE key_hash='hash_abc'
  3. Get org_id, scopes, rate_limit from key row
  4. Verify org_id from JWT (if logged in) or fall back to key's org
  5. Load Membership: user + org → role
  6. Enforce role-based access (viewer can only read, member can create tasks, etc.)
```

### RBAC Roles

- **owner** — Create/manage orgs, invite users, manage billing, full access to tasks/workflows.
- **admin** — Manage users, profiles, API keys, settings; no billing access.
- **member** — Create/run tasks, create/edit own skills, manage own profiles.
- **viewer** — Read-only: view sessions, tasks, logs, artifacts; no write access.

### API Key Security

- Generated as random 32-byte hex string: `sk_` + 64 hex chars.
- Hashed using bcrypt (cost 12) before storage.
- Scoped to org; optional granular permissions (e.g., "sessions:read", "tasks:write").
- Rate limit per key (default 1000 req/hour; configurable).
- Rotatable via dashboard; old key invalidated immediately.

### Input Validation

- **All boundaries** validated with Zod schemas (API, CLI, MCP).
- **URL validation**: Allowed-list enforcement (org-level config).
- **Action payload**: Schema validation; unknown fields rejected.
- **Profile config**: Fingerprint config validated (no arbitrary JS injection).

---

## 9. Deployment & Scaling

### Local Development (`pnpm dev`)

```bash
docker-compose up -d  # Postgres, Redis, MinIO
pnpm install
pnpm dev              # Starts: web (3000), api (3000 via Vercel), scheduler (3001), browser-worker (8080)
```

### Staging / Production

**Infrastructure stack:**
- **Web**: Vercel (Next.js auto-scaling, edge functions).
- **API**: Fly.io or AWS ECS (auto-scale on CPU/memory).
- **Scheduler**: Single instance (or replicated leader/follower for HA).
- **Browser workers**: Kubernetes StatefulSet or ECS task pool (auto-scale on queue depth).
- **Database**: Managed PostgreSQL (RDS, Aurora).
- **Redis**: Managed Redis (ElastiCache, Redis Enterprise).
- **Object storage**: AWS S3 (or MinIO in private cloud).

**Deployment process:**
1. CI/CD (GitHub Actions) on push to `main`:
   - Typecheck, lint, test, build Docker images.
   - Push images to ECR.
2. Terraform / SST applies infra changes.
3. Deploy in order: DB migrations → API → scheduler → workers → web (via Vercel).

---

## 10. Monitoring & Observability

### Metrics (Prometheus)

- `http_requests_total` (by endpoint, method, status)
- `http_request_duration_seconds` (histogram)
- `task_execution_duration_seconds` (histogram, by action type)
- `task_success_rate` (gauge, org-scoped)
- `credit_ledger_balance` (gauge, per org)
- `session_active_count` (gauge)
- `queue_depth_bytes` (Redis queue size)
- `worker_cpu_percent`, `worker_memory_bytes` (per worker)

### Logging (Pino, structured JSON)

```json
{
  "timestamp": "2026-07-08T10:30:45.123Z",
  "level": "info",
  "service": "api",
  "request_id": "req_abc123",
  "org_id": "org_xyz",
  "user_id": "user_456",
  "message": "Task executed",
  "action": "task_execute",
  "task_id": "task_def456",
  "duration_ms": 3421,
  "credit_deducted": 44
}
```

### Distributed Tracing (OpenTelemetry)

```
POST /api/tasks
  ├─ Trace ID: trace_123
  ├─ Span: API handler (100ms)
  │   ├─ Span: DB query (10ms)
  │   ├─ Span: Enqueue job (5ms)
  ├─ Span: Worker execute (3000ms)
  │   ├─ Span: action:navigate (500ms)
  │   ├─ Span: action:click (300ms)
  │   └─ Span: action:extract (1500ms)
```

### Health Checks

- **API**: `GET /health` → `{ "status": "ok", "db": "ok", "redis": "ok" }`
- **Scheduler**: `GET /health` → `{ "status": "ok", "queue_depth": 123 }`
- **Worker**: `GET /health` → `{ "status": "ok", "active_sessions": 5, "memory_percent": 42 }`

---

## Summary

This architecture provides:

1. **Clear separation of concerns**: Stateless API, stateful workers, decoupled via queue.
2. **Horizontal scalability**: API, scheduler, workers scale independently.
3. **Fault tolerance**: Worker failure → session reassigned; task failure → retry; data loss → audit log.
4. **Multi-tenancy**: Every query scoped; strong isolation; RBAC enforced.
5. **Observability**: Structured logging, distributed traces, Prometheus metrics, health checks.
6. **Security**: Hashed API keys, input validation, RBAC, audit logging, no secrets in code.

Next: **Await review of this plan + architecture before proceeding to M0.**

