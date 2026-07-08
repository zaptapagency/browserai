/**
 * Core domain types for BrowserAI platform
 */

// ===== User & Organization =====

export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  keyHash: string; // bcrypt hashed
  scopes: string[];
  rateLimit: number; // requests per hour
  expiresAt: Date | null;
  createdAt: Date;
  createdById: string;
}

// ===== Browser Sessions & Profiles =====

export type ProfileMode = 'rotating' | 'fixed-identity' | 'local-chrome';

export interface BrowserProfile {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  mode: ProfileMode;
  fingerprintConfig: Record<string, unknown>; // User agent, device, etc.
  proxyBindingId: string | null;
  workspaceRef: string | null; // S3 path for persisted data
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}

export type SessionStatus = 'pending' | 'starting' | 'active' | 'paused' | 'closing' | 'closed';

export interface Session {
  id: string;
  organizationId: string;
  profileId: string;
  status: SessionStatus;
  workspaceRef: string | null; // S3 path
  liveViewToken: string | null;
  workerHost: string | null; // e.g., "worker-1:8080"
  workerPid: number | null;
  startedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  createdById: string;
}

export interface SessionArtifact {
  id: string;
  sessionId: string;
  type: 'screenshot' | 'har' | 'video' | 'csv' | 'json' | 'logs';
  s3Path: string;
  sizeBytes: number;
  createdAt: Date;
}

// ===== Tasks & Workflows =====

export type TaskStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled';

export interface Task {
  id: string;
  organizationId: string;
  sessionId: string;
  definition: Record<string, unknown>; // Zod validated action schema
  status: TaskStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  creditEstimate: number;
  creditActual: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  createdById: string;
}

export interface Workflow {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  canvasDefinition: Record<string, unknown>; // React Flow nodes + edges
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  releasedAt: Date | null; // null if draft
  changelog: string | null;
}

export type WorkflowRunStatus = 'running' | 'success' | 'error' | 'paused' | 'cancelled';

export interface WorkflowRun {
  id: string;
  organizationId: string;
  workflowVersionId: string;
  status: WorkflowRunStatus;
  creditCost: number;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  createdById: string;
  scheduledRunId: string | null;
}

export interface StepExecution {
  id: string;
  workflowRunId: string;
  stepIndex: number;
  stepNode: Record<string, unknown>;
  status: TaskStatus;
  output: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;
}

// ===== Skills =====

export interface Skill {
  id: string;
  organizationId: string | null; // null = published globally
  name: string;
  description: string | null;
  definition: Record<string, unknown>; // Zod schema
  language: 'bash' | 'typescript' | 'python';
  code: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}

export interface SkillVersion {
  id: string;
  skillId: string;
  versionNumber: number;
  releasedAt: Date | null;
  changelog: string | null;
}

export interface SkillInstall {
  id: string;
  organizationId: string;
  skillVersionId: string;
  installedAt: Date;
  installedById: string;
}

// ===== Proxies & Anti-Blocking =====

export interface ProxyProvider {
  id: string;
  organizationId: string | null; // null = global
  name: string;
  adapterType: 'residential' | 'datacenter' | 'rotating' | 'mock';
  credentialsEncrypted: string;
  config: Record<string, unknown>;
  createdAt: Date;
}

export interface ProxyBinding {
  id: string;
  organizationId: string;
  profileId: string | null;
  proxyProviderId: string;
  poolConfig: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
}

export type CaptchaType =
  | 'hcaptcha'
  | 'recaptcha_v2'
  | 'recaptcha_v3'
  | 'cloudflare'
  | 'other';
export type CaptchaSolver = '2captcha' | 'deathbycaptcha' | 'human' | 'mock';

export interface CaptchaSolveEvent {
  id: string;
  sessionId: string;
  captchaType: CaptchaType;
  detectedAt: Date;
  solver: CaptchaSolver;
  solvedAt: Date | null;
  token: string | null;
  error: string | null;
  creditCost: number;
}

// ===== Remote Assist =====

export interface RemoteAssistSession {
  id: string;
  sessionId: string;
  accessToken: string; // signed JWT
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  usedById: string | null;
  handedBackAt: Date | null;
}

// ===== Billing & Credits =====

export interface Plan {
  id: string;
  name: 'free' | 'pro' | 'business' | 'enterprise';
  monthlyCreditGrant: number;
  rateLimitConcurrency: number;
  features: string[];
  stripeProductId: string | null;
  createdAt: Date;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  billingCycleAnchor: Date;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreditLedgerType =
  | 'grant'
  | 'task_execution'
  | 'captcha'
  | 'skill_run'
  | 'monthly_grant'
  | 'bonus'
  | 'refund';

export interface CreditLedger {
  id: string;
  organizationId: string;
  amount: number; // signed: positive = grant, negative = debit
  type: CreditLedgerType;
  reference: string | null; // task_id, event_id, etc.
  createdAt: Date;
}

export interface UsageEvent {
  id: string;
  organizationId: string;
  eventType: 'task' | 'captcha' | 'skill';
  reference: string; // task_id, event_id, etc.
  creditDeducted: number;
  recordedAt: Date;
}

export interface Invoice {
  id: string;
  organizationId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  totalCreditsConsumed: number;
  totalPriceUsd: number;
  stripeInvoiceId: string | null;
  status: 'draft' | 'issued' | 'paid' | 'failed';
  createdAt: Date;
  dueAt: Date;
  paidAt: Date | null;
}

// ===== Audit & Compliance =====

export interface AuditLog {
  id: string;
  organizationId: string;
  actorId: string | null; // user_id or api_key_id
  action: string; // e.g., "task_create", "profile_update"
  resourceType: string; // e.g., "task", "profile"
  resourceId: string;
  changesBefore: Record<string, unknown> | null;
  changesAfter: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ===== Affiliate =====

export interface AffiliateAccount {
  id: string;
  userId: string;
  organizationId: string;
  referralUrlToken: string;
  active: boolean;
  createdAt: Date;
}

export interface Referral {
  id: string;
  affiliateAccountId: string;
  referredOrganizationId: string;
  creditedAt: Date | null;
}
