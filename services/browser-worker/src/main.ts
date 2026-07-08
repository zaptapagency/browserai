/**
 * BrowserAI Browser Worker
 * Playwright runtime for executing browser actions in isolated contexts
 *
 * Milestone 0: Placeholder only
 * Full implementation in M1 (browser automation core)
 */

import express from 'express';
import { getEnv } from '@browserai/config';

const app = express();
app.use(express.json());

async function main() {
  const env = getEnv();

  console.log('🌐 BrowserAI Browser Worker starting...');
  console.log(`   Port: ${env.WORKER_PORT}`);
  console.log(`   Max sessions: ${env.WORKER_MAX_SESSIONS}`);
  console.log(`   Session TTL: ${env.WORKER_SESSION_TTL_MS}ms`);

  // TODO (M1): Initialize Playwright browser pool
  // TODO (M1): Implement session lifecycle management
  // TODO (M1): Implement action executor (navigate, click, type, extract, etc.)
  // TODO (M1): Implement WebSocket live view streaming
  // TODO (M1): Implement heartbeat registration to Redis

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      active_sessions: 0, // TODO (M1): actual count
      uptime: process.uptime(),
    });
  });

  // Internal endpoints (called by scheduler)
  // TODO (M1): POST /internal/sessions - create session
  // TODO (M1): POST /internal/tasks - execute task
  // TODO (M1): DELETE /internal/sessions/:id - close session

  app.listen(env.WORKER_PORT, () => {
    console.log(`✅ Browser worker ready (M1+)`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down browser worker...');
    // TODO (M1): Close all browser contexts
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('❌ Browser worker failed:', err);
  process.exit(1);
});
