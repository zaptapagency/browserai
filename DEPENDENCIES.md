# Third-Party Service Dependencies

**Document Date**: 2026-07-08
**Status**: For MVP to Launch — third-party integrations categorized by requirement phase.

---

## Service Matrix

| Service | Category | MVP Status | Notes | Reason |
|---------|----------|------------|-------|--------|
| **PostgreSQL** | Database | **Required Now** | Primary persistent state | Drizzle ORM, open-source |
| **Redis** | Cache/Queue | **Required Now** | BullMQ job queue, rate limiting, session cache | Core to job orchestration |
| **MinIO / S3** | Object Storage | **Required Now** (MinIO local, S3 prod) | Screenshots, videos, HAR, exports | Essential for artifacts |
| **Playwright** | Browser Automation | **Required Now** | Chromium automation via Playwright | Open-source, production-grade |
| **Stripe** | Billing & Payments | **Required Now** | Subscription plans, metered credit billing | Handles USD payments + usage reporting |
| **Better Auth** | Authentication (MVP) | **Required Now** | Email + OAuth (GitHub, Google) | Open-source, self-hosted |
| **OpenTelemetry** | Observability | **Required (M9+)** | Distributed tracing | Open-source, vendor-agnostic |
| **Prometheus / Grafana** | Metrics & Dashboards | **Required (M9+)** | Application metrics, monitoring | Open-source |
| **Sentry** | Error Tracking | **Behind Feature Flag (M9+)** | Exception + error reporting to Sentry cloud | Optional; local fallback via logs |
| **2Captcha** | CAPTCHA Solving | **Behind Feature Flag (M2)** | Real CAPTCHA solver API | Mocked locally; enable via `ENABLE_REAL_CAPTCHA_SOLVER=true` |
| **DeathByCaptcha** | CAPTCHA Solving (Alt) | **Behind Feature Flag (M2)** | Alternative CAPTCHA provider | Same as 2Captcha; selectable via config |
| **Bright Data** | Residential Proxies | **Behind Feature Flag (M2)** | Real residential proxy provider | Mocked locally; enable via `ENABLE_REAL_PROXY_PROVIDER=true` |
| **WorkOS** | SSO / SAML (Enterprise) | **Behind Feature Flag (M8)** | Enterprise SSO & SAML support | Optional; replaces Better Auth for enterprise tier |
| **Vercel** | Web Hosting | **Recommended (M10)** | Deployment platform for Next.js web app | Auto-scaling, edge functions, CDN |
| **Fly.io / AWS ECS** | API Hosting | **Recommended (M10)** | Deployment platform for NestJS API + scheduler | Docker containers, auto-scaling |
| **AWS RDS / Aurora** | Managed Database | **Recommended (M10)** | Production PostgreSQL | Automated backups, HA, monitoring |
| **AWS ElastiCache / Redis Enterprise** | Managed Redis | **Recommended (M10)** | Production-grade Redis | Pub/sub, cluster mode, persistence |
| **Slack** | Notifications (Optional) | **Behind Feature Flag (M8+)** | Task completion + error alerts to Slack | Opt-in via webhook integration |
| **SendGrid / Mailgun** | Email Delivery (Optional) | **Behind Feature Flag (M8+)** | Transactional email (alerts, invoices, etc.) | Opt-in; local SMTP fallback for dev |
| **Terraform / SST** | Infrastructure as Code | **Recommended (M10)** | Deployment automation | Manages AWS/cloud resources, state tracking |

---

## Development Setup (MVP — M0 to M6)

### Required Local Services (Docker Compose)

All run locally on `localhost` via `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: browserai_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev_password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
```

### Required Configuration (`.env.example`)

```env
# ===== Core Services =====
DATABASE_URL="postgresql://dev:dev_password@localhost:5432/browserai_dev"
REDIS_URL="redis://localhost:6379"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="browserai-dev"

# ===== Authentication (Better Auth) =====
BETTER_AUTH_SECRET="your-random-secret-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000/auth"
GITHUB_OAUTH_ID="your-github-app-id"
GITHUB_OAUTH_SECRET="your-github-app-secret"

# ===== Stripe (Billing) =====
STRIPE_SECRET_KEY="sk_test_..." (test key only for dev/staging)
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..." (for webhook validation)

# ===== CAPTCHA Solving (Feature-Flagged) =====
ENABLE_REAL_CAPTCHA_SOLVER="false" (default: use mock)
CAPTCHA_SOLVER_TYPE="mock" (options: mock, 2captcha, deathbycaptcha)
CAPTCHA_SOLVER_API_KEY="" (set if using real solver)

# ===== Proxy Provider (Feature-Flagged) =====
ENABLE_REAL_PROXY_PROVIDER="false" (default: use mock)
PROXY_PROVIDER_TYPE="mock" (options: mock, bright_data, other)
PROXY_PROVIDER_API_KEY="" (set if using real provider)

# ===== Observability =====
ENABLE_SENTRY="false" (default: off; enable at M9)
SENTRY_DSN=""
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318" (local Jaeger/OTEL collector)

# ===== Notifications (Feature-Flagged) =====
ENABLE_EMAIL_NOTIFICATIONS="false"
EMAIL_PROVIDER="mock" (options: mock, sendgrid, mailgun)
SENDGRID_API_KEY="" (if using SendGrid)
SLACK_WEBHOOK_URL="" (for Slack notifications)

# ===== Feature Flags =====
FEATURE_DEMO_MODE="true" (show demo flows)
FEATURE_SKILL_MARKETPLACE="false" (disabled until M6)
FEATURE_ENTERPRISE_SSO="false" (disabled until M8)
```

---

## Transition Points

### M0 → M1: Browser Runtime

- **New**: None (all M0 services already running locally).

### M1 → M2: Profiles & Adapters

- **New**: Provider adapter system fully designed; mocks hardcoded to return safe defaults.
- **Mocked providers**:
  - `ProxyAdapter` → mock always returns `http://127.0.0.1:3128` (or localhost bypass).
  - `CaptchaAdapter` → mock auto-solves with a dummy token.

### M2 → M3: Public API & SDK

- **No new external services** needed. All continue to run locally.
- **Stripe begins integration** (test mode only; webhook handling scaffolded).

### M4 → M5: Workflows & Marketplace

- **No new external services**.

### M5 → M6: Skills Marketplace

- **No new external services**.

### M6 → M7: Billing & Credits

- **Stripe goes live**: Production credentials must be configured (`STRIPE_SECRET_KEY` from production key).
- **CreditLedger** becomes the source of truth; reconciliation job logs usage.

### M7 → M8: Teams, RBAC, Audit

- **Email notifications (optional)**: Sendgrid or Mailgun can be wired (behind `ENABLE_EMAIL_NOTIFICATIONS` flag).
- **Slack integration (optional)**: Webhook URL for task alerts.

### M8 → M9: Observability

- **Sentry**: Enable via `ENABLE_SENTRY=true` + `SENTRY_DSN`.
- **OpenTelemetry**: Local Jaeger collector for dev; Datadog / Grafana Cloud for prod.
- **Prometheus**: Scraped locally; Grafana dashboard for local dev.

### M9 → M10: Deploy & Production

- **Cloud providers**: Vercel, Fly.io, AWS RDS, AWS ElastiCache.
- **Real CAPTCHA solvers**: If needed, enable via feature flag + API key.
- **Real proxy providers**: If needed, enable via feature flag + API key.
- **WorkOS**: Optional enterprise SSO, enabled via `FEATURE_ENTERPRISE_SSO=true`.

---

## Cost Breakdown (Estimate)

### MVP Phase (M0–M6)

| Service | Cost | Notes |
|---------|------|-------|
| **Development** | ~$0 | Local Docker + open-source |
| **Stripe Test** | $0 | No charges in test mode |
| **Playwright** | $0 | Open-source |
| **Total** | **$0** | Fully free (MVP) |

### Early Launch (M7 onwards, small scale)

| Service | Cost (monthly) | Notes |
|---------|---|---|
| **AWS RDS** | $50–100 | PostgreSQL, single AZ |
| **AWS ElastiCache** | $30–60 | Redis, small cluster |
| **AWS S3** | $10–30 | Storage + transfer |
| **Vercel** | ~$20–50 | Pro plan (edge functions) |
| **Fly.io / ECS** | $50–150 | API + scheduler + worker pool |
| **Stripe** | 2.9% + $0.30 per transaction | Billing processor |
| **Sentry** | $29 (Plan) | Error tracking |
| **CAPTCHA Solver** | $0.50–2 per 1000 (if enabled) | Only if needed; configurable |
| **Residential Proxy** | $5–50 per GB (if enabled) | Only if needed; configurable |
| **Total** | **$180–500/mo** | Scales with usage |

---

## Dependency Resolution Priority

### Phase 1: MVP Feature Complete (M0–M6)

**Install immediately** (in repo):
- ✅ Playwright, Drizzle, PostgreSQL, Redis, Zod, NestJS, Next.js, shadcn/ui, Tailwind.
- ✅ Better Auth (self-hosted), Stripe SDK (test mode).
- ✅ OpenTelemetry, Pino (structured logging).

**Design but mock** (adapters):
- ⚠️ Proxy provider adapters (mock implementation only).
- ⚠️ CAPTCHA solver adapters (mock implementation only).

### Phase 2: Production Ready (M7–M9)

**Enable selectively** (behind flags):
- ✅ Sentry (error tracking).
- ✅ Real CAPTCHA solver (2Captcha or DeathByCaptcha) — if needed for non-test use.
- ✅ Real proxy provider (Bright Data, Oxylabs, etc.) — if needed for anti-bot testing.
- ✅ Email notifications (Sendgrid / Mailgun) — for transactional emails.
- ✅ Slack integration — for team notifications.

**Ask user before wiring**:
- Real proxy credentials (requires legitimate use case + user acknowledgment).
- Real CAPTCHA solver (requires users to understand ToS implications).

### Phase 3: Deployment (M10)

**Infrastructure decisions**:
- Cloud provider for API (Fly.io vs. AWS ECS vs. Heroku).
- Managed database (RDS vs. Aurora vs. DigitalOcean).
- Observability backend (Datadog vs. Grafana Cloud vs. self-hosted).

---

## Hardcoded Defaults (No External Service Required)

| Feature | Default Behavior |
|---------|------------------|
| Profile mode | `rotating` + `mock` proxy (localhost bypass) |
| CAPTCHA solver | `mock` (auto-approves) |
| Session TTL | 1 hour (stored in memory + Redis) |
| Rate limiting | 1000 req/hour per API key (Redis in-memory counter) |
| Artifact storage | MinIO (local) or S3 (prod, optional) |
| Error reporting | Structured logs to stdout (Sentry is optional) |
| Email notifications | Disabled by default (configurable) |

---

## Security Assumptions

1. **No hardcoded secrets**: All API keys, credentials, and webhooks configured via environment variables.
2. **Feature flags for risky features**: CAPTCHA solving, proxy routing, and bot-detection bypass are behind flags with explicit opt-in.
3. **Audit logging**: Every mutating action (especially those involving proxies, CAPTCHA, or sensitive configs) is logged with actor, action, timestamp, and approval token.
4. **Rate limiting**: Built-in via Redis; configurable per org.
5. **API key rotation**: Keys can be rotated in the dashboard; old key invalidated immediately.

---

## Recommended Reading Order

1. **PLAN.md** — Scope, milestones, data model, assumptions.
2. **ARCHITECTURE.md** — System design, service topology, request lifecycle, action protocol.
3. **DEPENDENCIES.md** (this file) — Third-party services, costs, phases.

Once reviewed and approved, proceed to **Milestone 0 (Foundation)**.

