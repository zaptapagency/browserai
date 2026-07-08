/**
 * @browserai/db - Database client and schema
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

let client: postgres.Sql | null = null;

/**
 * Get or create the database client
 */
export function getDb() {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    client = postgres(connectionString);
  }

  return drizzle(client, { schema });
}

/**
 * Close database connection
 */
export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
}

// Export schema for migrations and type safety
export * from './schema/index';
