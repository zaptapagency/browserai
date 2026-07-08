/**
 * Typed environment variable loader
 * Validates all configuration at startup
 */

import { z } from 'zod';

const EnvSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('browserai'),
  APP_URL: z.string().url(),

  // Core Services
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_USE_PATH_STYLE: z.string().default('false').transform((v) => v === 'true'),

  // Authentication (Better Auth)
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_TRUST_HOST: z.string().default('true').transform((v) => v === 'true'),
  GITHUB_OAUTH_ID: z.string().default(''),
  GITHUB_OAUTH_SECRET: z.string().default(''),

  // Stripe (Billing)
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),

  // Feature Flags
  ENABLE_REAL_CAPTCHA_SOLVER: z.string().default('false').transform((v) => v === 'true'),
  CAPTCHA_SOLVER_TYPE: z.enum(['mock', '2captcha', 'deathbycaptcha']).default('mock'),
  CAPTCHA_SOLVER_API_KEY: z.string().default(''),

  ENABLE_REAL_PROXY_PROVIDER: z.string().default('false').transform((v) => v === 'true'),
  PROXY_PROVIDER_TYPE: z.enum(['mock', 'bright_data']).default('mock'),
  PROXY_PROVIDER_API_KEY: z.string().default(''),

  ENABLE_SENTRY: z.string().default('false').transform((v) => v === 'true'),
  SENTRY_DSN: z.string().default(''),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default('http://localhost:4318'),

  ENABLE_EMAIL_NOTIFICATIONS: z.string().default('false').transform((v) => v === 'true'),
  EMAIL_PROVIDER: z.enum(['mock', 'sendgrid', 'mailgun']).default('mock'),
  SENDGRID_API_KEY: z.string().default(''),
  SLACK_WEBHOOK_URL: z.string().url().optional().or(z.string().length(0)),

  FEATURE_DEMO_MODE: z.string().default('true').transform((v) => v === 'true'),
  FEATURE_SKILL_MARKETPLACE: z.string().default('false').transform((v) => v === 'true'),
  FEATURE_ENTERPRISE_SSO: z.string().default('false').transform((v) => v === 'true'),

  // API Configuration
  API_PORT: z.string().default('3000').transform(Number).pipe(z.number().int().positive()),
  API_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Worker Configuration
  WORKER_PORT: z.string().default('8080').transform(Number).pipe(z.number().int().positive()),
  WORKER_MAX_SESSIONS: z
    .string()
    .default('10')
    .transform(Number)
    .pipe(z.number().int().positive()),
  WORKER_SESSION_TTL_MS: z
    .string()
    .default('3600000')
    .transform(Number)
    .pipe(z.number().int().positive()),

  // Scheduler Configuration
  SCHEDULER_PORT: z.string().default('3001').transform(Number).pipe(z.number().int().positive()),
  SCHEDULER_ENABLED: z.string().default('true').transform((v) => v === 'true'),

  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_HOUR: z
    .string()
    .default('1000')
    .transform(Number)
    .pipe(z.number().int().positive()),
  RATE_LIMIT_REQUESTS_PER_MINUTE: z
    .string()
    .default('100')
    .transform(Number)
    .pipe(z.number().int().positive()),
});

export type Environment = z.infer<typeof EnvSchema>;

let cachedEnv: Environment | null = null;

/**
 * Load and validate environment variables
 * Throws immediately if validation fails
 */
export function loadEnv(): Environment {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Get cached environment
 * Use this instead of loadEnv() after initial load
 */
export function getEnv(): Environment {
  if (!cachedEnv) {
    return loadEnv();
  }
  return cachedEnv;
}

// Auto-load on module import in production
if (process.env.NODE_ENV !== 'test') {
  loadEnv();
}
