/**
 * BrowserAI Scheduler
 * BullMQ consumer for job processing
 *
 * Milestone 0: Placeholder only
 * Full implementation in M1 (task queue processor)
 */

import { getEnv } from '@browserai/config';

async function main() {
  const env = getEnv();

  console.log('🎯 BrowserAI Scheduler starting...');
  console.log(`   Redis: ${env.REDIS_URL}`);
  console.log(`   Port: ${env.SCHEDULER_PORT}`);

  // TODO (M1): Instantiate BullMQ queues and processors
  // TODO (M1): Register job handlers for:
  //   - CreateSessionJob
  //   - ExecuteTaskJob
  //   - WorkflowRunJob
  //   - SessionCleanupJob
  //   - UsageReconcileJob

  if (env.SCHEDULER_ENABLED) {
    console.log('✅ Scheduler ready to process jobs (M1+)');
  } else {
    console.log('⏸️  Scheduler disabled');
  }

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('❌ Scheduler failed:', err);
  process.exit(1);
});
