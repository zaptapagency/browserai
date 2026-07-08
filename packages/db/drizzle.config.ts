import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://dev:dev_password@localhost:5432/browserai_dev',
  },
  migrations: {
    prefix: 'timestamp',
  },
} satisfies Config;
