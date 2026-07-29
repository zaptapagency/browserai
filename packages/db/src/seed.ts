/**
 * Seed script for development database
 * Populates with demo data for testing
 */

import { getDb, closeDb, plans } from './index';

async function seed() {
  console.log('Seeding database...');

  const db = getDb();

  try {
    // Create plans if they don't exist
    await db
      .insert(plans)
      .values([
        {
          id: 'plan_free',
          name: 'free',
          monthlyCreditGrant: 100,
          rateLimitConcurrency: 1,
          features: ['basic_sessions', 'task_execution'],
          stripeProductId: null,
        },
        {
          id: 'plan_pro',
          name: 'pro',
          monthlyCreditGrant: 10000,
          rateLimitConcurrency: 10,
          features: ['basic_sessions', 'task_execution', 'workflows', 'api_keys'],
          stripeProductId: null,
        },
        {
          id: 'plan_business',
          name: 'business',
          monthlyCreditGrant: 100000,
          rateLimitConcurrency: 50,
          features: [
            'basic_sessions',
            'task_execution',
            'workflows',
            'api_keys',
            'skills',
            'team_management',
          ],
          stripeProductId: null,
        },
      ])
      .onConflictDoNothing();

    console.log('✅ Seeding complete');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

void seed();
