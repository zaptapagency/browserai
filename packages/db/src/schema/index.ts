/**
 * Drizzle ORM Schema for BrowserAI
 *
 * All tables with proper foreign keys, indexes, and constraints.
 * Uses Drizzle's `relations` for type-safe joins.
 */

import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===== Users & Authentication =====

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    name: varchar('name', { length: 255 }),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  })
);

// ===== Organizations =====

export const organizations = pgTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    description: text('description'),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
    ownerIdIdx: index('organizations_owner_id_idx').on(table.ownerId),
  })
);

export const memberships = pgTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull(), // owner, admin, member, viewer
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: uniqueIndex('memberships_user_org_idx').on(table.userId, table.organizationId),
    orgIdx: index('memberships_org_id_idx').on(table.organizationId),
  })
);

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    keyHash: varchar('key_hash', { length: 255 }).notNull(), // bcrypt hashed
    scopes: text('scopes').array().notNull().default([]),
    rateLimit: integer('rate_limit').notNull().default(1000),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    keyHashIdx: uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
    orgIdx: index('api_keys_org_id_idx').on(table.organizationId),
  })
);

// ===== Browser Profiles =====

export const browserProfiles = pgTable(
  'browser_profiles',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    mode: varchar('mode', { length: 50 }).notNull(), // rotating, fixed-identity, local-chrome
    fingerprintConfig: jsonb('fingerprint_config').notNull().default({}),
    proxyBindingId: text('proxy_binding_id'),
    workspaceRef: text('workspace_ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    orgIdx: index('browser_profiles_org_id_idx').on(table.organizationId),
  })
);

// ===== Sessions =====

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    profileId: text('profile_id')
      .notNull()
      .references(() => browserProfiles.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull(), // pending, starting, active, paused, closing, closed
    workspaceRef: text('workspace_ref'),
    liveViewToken: text('live_view_token'),
    workerHost: varchar('worker_host', { length: 255 }),
    workerPid: integer('worker_pid'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    orgIdx: index('sessions_org_id_idx').on(table.organizationId),
    profileIdx: index('sessions_profile_id_idx').on(table.profileId),
    statusIdx: index('sessions_status_idx').on(table.status),
  })
);

export const sessionArtifacts = pgTable(
  'session_artifacts',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // screenshot, har, video, csv, json, logs
    s3Path: text('s3_path').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('session_artifacts_session_id_idx').on(table.sessionId),
  })
);

// ===== Tasks =====

export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    definition: jsonb('definition').notNull(),
    status: varchar('status', { length: 50 }).notNull(), // queued, running, success, error, cancelled
    result: jsonb('result'),
    error: text('error'),
    creditEstimate: integer('credit_estimate').notNull().default(0),
    creditActual: integer('credit_actual'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    orgIdx: index('tasks_org_id_idx').on(table.organizationId),
    sessionIdx: index('tasks_session_id_idx').on(table.sessionId),
    statusIdx: index('tasks_status_idx').on(table.status),
  })
);

// ===== Workflows =====

export const workflows = pgTable(
  'workflows',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    canvasDefinition: jsonb('canvas_definition').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    orgIdx: index('workflows_org_id_idx').on(table.organizationId),
  })
);

export const workflowVersions = pgTable(
  'workflow_versions',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    changelog: text('changelog'),
  },
  (table) => ({
    workflowIdx: index('workflow_versions_workflow_id_idx').on(table.workflowId),
    releasedIdx: index('workflow_versions_released_idx').on(table.releasedAt),
  })
);

export const workflowRuns = pgTable(
  'workflow_runs',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    workflowVersionId: text('workflow_version_id')
      .notNull()
      .references(() => workflowVersions.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull(), // running, success, error, paused, cancelled
    creditCost: integer('credit_cost').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    scheduledRunId: text('scheduled_run_id'),
  },
  (table) => ({
    orgIdx: index('workflow_runs_org_id_idx').on(table.organizationId),
    versionIdx: index('workflow_runs_version_id_idx').on(table.workflowVersionId),
    statusIdx: index('workflow_runs_status_idx').on(table.status),
  })
);

export const stepExecutions = pgTable(
  'step_executions',
  {
    id: text('id').primaryKey(),
    workflowRunId: text('workflow_run_id')
      .notNull()
      .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    stepIndex: integer('step_index').notNull(),
    stepNode: jsonb('step_node').notNull(),
    status: varchar('status', { length: 50 }).notNull(), // success, error, skipped
    output: jsonb('output'),
    error: text('error'),
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    runIdx: index('step_executions_run_id_idx').on(table.workflowRunId),
  })
);

// ===== Skills =====

export const skills = pgTable(
  'skills',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }), // null = published globally
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    definition: jsonb('definition').notNull(),
    language: varchar('language', { length: 50 }).notNull(), // bash, typescript, python
    code: text('code').notNull(),
    tags: text('tags').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdById: text('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    orgIdx: index('skills_org_id_idx').on(table.organizationId),
  })
);

export const skillVersions = pgTable(
  'skill_versions',
  {
    id: text('id').primaryKey(),
    skillId: text('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    changelog: text('changelog'),
  },
  (table) => ({
    skillIdx: index('skill_versions_skill_id_idx').on(table.skillId),
  })
);

export const skillInstalls = pgTable(
  'skill_installs',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    skillVersionId: text('skill_version_id')
      .notNull()
      .references(() => skillVersions.id, { onDelete: 'cascade' }),
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
    installedById: text('installed_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    orgIdx: index('skill_installs_org_id_idx').on(table.organizationId),
  })
);

// ===== Proxies & Anti-Blocking =====

export const proxyProviders = pgTable(
  'proxy_providers',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }), // null = global
    name: varchar('name', { length: 255 }).notNull(),
    adapterType: varchar('adapter_type', { length: 50 }).notNull(), // residential, datacenter, rotating, mock
    credentialsEncrypted: text('credentials_encrypted').notNull(),
    config: jsonb('config').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('proxy_providers_org_id_idx').on(table.organizationId),
  })
);

export const proxyBindings = pgTable(
  'proxy_bindings',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    profileId: text('profile_id').references(() => browserProfiles.id, { onDelete: 'cascade' }),
    proxyProviderId: text('proxy_provider_id')
      .notNull()
      .references(() => proxyProviders.id, { onDelete: 'cascade' }),
    poolConfig: jsonb('pool_config').notNull().default({}),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('proxy_bindings_org_id_idx').on(table.organizationId),
    profileIdx: index('proxy_bindings_profile_id_idx').on(table.profileId),
  })
);

export const captchaSolveEvents = pgTable(
  'captcha_solve_events',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    captchaType: varchar('captcha_type', { length: 50 }).notNull(), // hcaptcha, recaptcha_v2, etc.
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
    solver: varchar('solver', { length: 50 }).notNull(), // 2captcha, deathbycaptcha, human, mock
    solvedAt: timestamp('solved_at', { withTimezone: true }),
    token: text('token'),
    error: text('error'),
    creditCost: integer('credit_cost').notNull().default(0),
  },
  (table) => ({
    sessionIdx: index('captcha_solve_events_session_id_idx').on(table.sessionId),
  })
);

// ===== Remote Assist =====

export const remoteAssistSessions = pgTable(
  'remote_assist_sessions',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    accessToken: text('access_token').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    usedById: text('used_by_id').references(() => users.id, { onDelete: 'set null' }),
    handedBackAt: timestamp('handed_back_at', { withTimezone: true }),
  },
  (table) => ({
    sessionIdx: index('remote_assist_sessions_session_id_idx').on(table.sessionId),
    tokenIdx: uniqueIndex('remote_assist_sessions_token_idx').on(table.accessToken),
  })
);

// ===== Billing & Credits =====

export const plans = pgTable(
  'plans',
  {
    id: text('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull(), // free, pro, business, enterprise
    monthlyCreditGrant: integer('monthly_credit_grant').notNull(),
    rateLimitConcurrency: integer('rate_limit_concurrency').notNull(),
    features: text('features').array().notNull().default([]),
    stripeProductId: varchar('stripe_product_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: uniqueIndex('plans_name_idx').on(table.name),
  })
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 50 }).notNull(), // trialing, active, past_due, cancelled
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    billingCycleAnchor: timestamp('billing_cycle_anchor', { withTimezone: true }).notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    orgIdx: uniqueIndex('subscriptions_org_id_idx').on(table.organizationId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
  })
);

export const creditLedger = pgTable(
  'credit_ledger',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(), // signed: positive = grant, negative = debit
    type: varchar('type', { length: 50 }).notNull(), // grant, task_execution, captcha, skill_run, monthly_grant, bonus, refund
    reference: text('reference'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('credit_ledger_org_id_idx').on(table.organizationId),
    createdIdx: index('credit_ledger_created_idx').on(table.createdAt),
  })
);

export const usageEvents = pgTable(
  'usage_events',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(), // task, captcha, skill
    reference: text('reference').notNull(),
    creditDeducted: integer('credit_deducted').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('usage_events_org_id_idx').on(table.organizationId),
    recordedIdx: index('usage_events_recorded_idx').on(table.recordedAt),
  })
);

export const invoices = pgTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriptionId: text('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    totalCreditsConsumed: integer('total_credits_consumed').notNull(),
    totalPriceUsd: integer('total_price_usd').notNull(), // in cents
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull(), // draft, issued, paid, failed
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => ({
    orgIdx: index('invoices_org_id_idx').on(table.organizationId),
    statusIdx: index('invoices_status_idx').on(table.status),
  })
);

// ===== Audit & Compliance =====

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    actorId: text('actor_id'), // user_id or api_key_id
    action: varchar('action', { length: 255 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }).notNull(),
    resourceId: text('resource_id').notNull(),
    changesBefore: jsonb('changes_before'),
    changesAfter: jsonb('changes_after'),
    ip: varchar('ip', { length: 50 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('audit_logs_org_id_idx').on(table.organizationId),
    createdIdx: index('audit_logs_created_idx').on(table.createdAt),
  })
);

// ===== Affiliate =====

export const affiliateAccounts = pgTable(
  'affiliate_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    referralUrlToken: varchar('referral_url_token', { length: 255 }).notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: uniqueIndex('affiliate_accounts_user_id_idx').on(table.userId),
    tokenIdx: uniqueIndex('affiliate_accounts_token_idx').on(table.referralUrlToken),
  })
);

export const referrals = pgTable(
  'referrals',
  {
    id: text('id').primaryKey(),
    affiliateAccountId: text('affiliate_account_id')
      .notNull()
      .references(() => affiliateAccounts.id, { onDelete: 'cascade' }),
    referredOrganizationId: text('referred_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    creditedAt: timestamp('credited_at', { withTimezone: true }),
  },
  (table) => ({
    affiliateIdx: index('referrals_affiliate_id_idx').on(table.affiliateAccountId),
  })
);

// ===== Drizzle Relations (for type-safe queries) =====

export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizations),
  memberships: many(memberships),
  apiKeys: many(apiKeys),
  browserProfiles: many(browserProfiles),
  sessions: many(sessions),
  tasks: many(tasks),
  workflows: many(workflows),
  skills: many(skills),
  skillInstalls: many(skillInstalls),
  workflowRuns: many(workflowRuns),
  affiliateAccounts: many(affiliateAccounts),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  memberships: many(memberships),
  apiKeys: many(apiKeys),
  browserProfiles: many(browserProfiles),
  sessions: many(sessions),
  tasks: many(tasks),
  workflows: many(workflows),
  skills: many(skills),
  skillInstalls: many(skillInstalls),
  proxyProviders: many(proxyProviders),
  proxyBindings: many(proxyBindings),
  subscriptions: many(subscriptions),
  creditLedger: many(creditLedger),
  usageEvents: many(usageEvents),
  invoices: many(invoices),
  auditLogs: many(auditLogs),
  workflowRuns: many(workflowRuns),
  affiliateAccounts: many(affiliateAccounts),
  referrals: many(referrals),
}));
