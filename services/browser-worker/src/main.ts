/**
 * BrowserAI Browser Worker
 *
 * Playwright runtime that owns browser sessions and executes the action
 * protocol. Exposes internal HTTP endpoints (called by the scheduler/API) and
 * a live-view WebSocket for streaming session state.
 *
 * Internal endpoints:
 *   POST   /internal/sessions                          → create a session
 *   POST   /internal/sessions/:id/tasks                 → run a task (sequence of actions)
 *   GET    /internal/sessions/:id/state                 → current page state
 *   DELETE /internal/sessions/:id                        → close a session
 *   POST   /internal/sessions/:id/remote-assist          → pause automation, issue a control token
 *   POST   /internal/sessions/:id/remote-assist/handback → resume automation
 *   GET    /health                                       → worker health
 */

import http from 'node:http';
import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { ActionSchema, type ActionResult } from '@browserai/core';
import { getEnv } from '@browserai/config';
import { createCaptchaAdapter, createProxyAdapter } from '@browserai/providers';
import { SessionManager } from './session';
import { TaskRunner } from './task-runner';
import { ArtifactManager } from './artifact-manager';
import { LiveViewServer } from './websocket-server';
import { scanPage } from './page-scanner';
import { signLiveViewToken } from './live-view-token';
import { signRemoteAssistToken } from './remote-assist-token';
import { ConfirmationRegistry } from './confirmation-registry';

const CreateSessionSchema = z.object({
  session_id: z.string().min(1),
  organization_id: z.string().min(1),
  profile_mode: z.enum(['rotating', 'fixed-identity', 'local-chrome']).default('rotating'),
  profile_name: z.string().optional(),
  user_data_dir: z.string().optional(),
  chrome_channel: z.enum(['chrome', 'chrome-beta', 'msedge']).optional(),
  use_proxy_adapter: z.boolean().optional(),
  proxy_rotation: z
    .object({
      rotatePerSession: z.boolean().optional(),
      rotatePerAction: z.boolean().optional(),
      poolSize: z.number().int().optional(),
    })
    .optional(),
  fingerprint: z
    .object({
      userAgent: z.string().optional(),
      viewport: z.object({ width: z.number(), height: z.number() }).optional(),
      locale: z.string().optional(),
      timezoneId: z.string().optional(),
      deviceScaleFactor: z.number().optional(),
    })
    .optional(),
  proxy: z
    .object({
      server: z.string(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
});

const RunTaskSchema = z.object({
  task_id: z.string().min(1),
  actions: z.array(ActionSchema).min(1),
  confirmations: z.record(z.string()).optional(),
});

/**
 * Wrap an async route handler so a rejected promise is surfaced as a 500
 * instead of an unhandled rejection (Express 4 does not await handlers).
 */
type AsyncRoute = (req: Request, res: Response) => Promise<unknown>;
const asyncHandler =
  (fn: AsyncRoute): ((req: Request, res: Response) => void) =>
  (req: Request, res: Response): void => {
    fn(req, res).catch((err: unknown) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'internal_error', message: (err as Error).message });
      }
    });
  };

async function main(): Promise<void> {
  const env = getEnv();

  const artifacts = new ArtifactManager({
    endpoint: env.S3_ENDPOINT,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    bucket: env.S3_BUCKET,
    usePathStyle: env.S3_USE_PATH_STYLE,
  });
  const proxyAdapter = createProxyAdapter();
  const captchaAdapter = createCaptchaAdapter();
  const confirmationRegistry = new ConfirmationRegistry(env.BETTER_AUTH_SECRET);

  const sessionManager = new SessionManager(env.WORKER_MAX_SESSIONS, { artifacts, proxyAdapter });
  const taskRunner = new TaskRunner(confirmationRegistry);

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const server = http.createServer(app);
  const liveView = new LiveViewServer(server, sessionManager, env.BETTER_AUTH_SECRET);

  // Track profile names per session for scan memory context
  const profileNames = new Map<string, string>();

  // ---- Health ----
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      active_sessions: sessionManager.activeCount,
      max_sessions: env.WORKER_MAX_SESSIONS,
      uptime: process.uptime(),
    });
  });

  // ---- Create session ----
  app.post(
    '/internal/sessions',
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = CreateSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'validation_error', details: parsed.error.errors });
      }
      const body = parsed.data;

      try {
        const session = await sessionManager.createSession({
          sessionId: body.session_id,
          organizationId: body.organization_id,
          profileMode: body.profile_mode,
          profileName: body.profile_name,
          userDataDir: body.user_data_dir,
          chromeChannel: body.chrome_channel,
          useProxyAdapter: body.use_proxy_adapter,
          proxyRotation: body.proxy_rotation,
          fingerprint: body.fingerprint,
          proxy: body.proxy,
          ttlMs: env.WORKER_SESSION_TTL_MS,
        });

        if (body.profile_name) {
          profileNames.set(session.id, body.profile_name);
        }

        const wsToken = signLiveViewToken(
          { sessionId: session.id, organizationId: session.organizationId },
          env.BETTER_AUTH_SECRET
        );

        return res.status(201).json({
          session_id: session.id,
          status: session.status,
          ws_token: wsToken,
          ready: true,
        });
      } catch (err) {
        return res
          .status(500)
          .json({ error: 'session_create_failed', message: (err as Error).message });
      }
    })
  );

  // ---- Run task ----
  app.post(
    '/internal/sessions/:id/tasks',
    asyncHandler(async (req: Request, res: Response) => {
      const sessionId = req.params.id;
      const parsed = RunTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'validation_error', details: parsed.error.errors });
      }
      if (!sessionManager.hasSession(sessionId)) {
        return res.status(404).json({ error: 'session_not_found' });
      }

      const session = sessionManager.getSession(sessionId);
      const profileName = profileNames.get(sessionId);

      // Stream each action result over the live-view socket
      const onAction = (result: ActionResult): void => {
        liveView.broadcastActionResult(sessionId, result);
      };
      taskRunner.on('action_complete', onAction);

      try {
        const result = await taskRunner.run(session, parsed.data.task_id, parsed.data.actions, {
          profileName,
          captchaAdapter,
          confirmations: parsed.data.confirmations as Record<number, string> | undefined,
        });

        // Capture a screenshot artifact at the end of the task (best-effort)
        const screenshot = await artifacts.captureScreenshot(session.page, sessionId);

        liveView.broadcastTaskComplete(sessionId, parsed.data.task_id, result.status);

        return res.json({
          task_id: result.taskId,
          status: result.status,
          results: result.results,
          error: result.error,
          duration_ms: result.durationMs,
          artifacts: screenshot ? [screenshot] : [],
        });
      } catch (err) {
        return res.status(500).json({ error: 'task_failed', message: (err as Error).message });
      } finally {
        taskRunner.off('action_complete', onAction);
      }
    })
  );

  // ---- Get current page state ----
  app.get(
    '/internal/sessions/:id/state',
    asyncHandler(async (req: Request, res: Response) => {
      const sessionId = req.params.id;
      if (!sessionManager.hasSession(sessionId)) {
        return res.status(404).json({ error: 'session_not_found' });
      }
      const session = sessionManager.getSession(sessionId);
      const state = await scanPage(session.page, sessionId, {
        profileName: profileNames.get(sessionId),
        actionCount: session.actionCount,
        startedAtMs: session.startedAtMs,
      });
      return res.json(state);
    })
  );

  // ---- Close session ----
  app.delete(
    '/internal/sessions/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const sessionId = req.params.id;
      if (!sessionManager.hasSession(sessionId)) {
        return res.status(404).json({ error: 'session_not_found' });
      }
      await sessionManager.closeSession(sessionId, 'user');
      profileNames.delete(sessionId);
      return res.json({ session_id: sessionId, status: 'closed' });
    })
  );

  // ---- Start remote-assist (human takeover) ----
  app.post(
    '/internal/sessions/:id/remote-assist',
    asyncHandler((req: Request, res: Response) => {
      const sessionId = req.params.id;
      if (!sessionManager.hasSession(sessionId)) {
        return Promise.resolve(res.status(404).json({ error: 'session_not_found' }));
      }
      const session = sessionManager.getSession(sessionId);
      session.remoteAssistActive = true;

      const controlToken = signRemoteAssistToken(
        { sessionId: session.id, organizationId: session.organizationId },
        env.BETTER_AUTH_SECRET
      );

      liveView.broadcastRemoteAssistStatus(sessionId, true);

      return Promise.resolve(
        res.status(201).json({
          session_id: sessionId,
          control_token: controlToken,
          control_path: `/sessions/${sessionId}/control`,
        })
      );
    })
  );

  // ---- End remote-assist, hand control back to automation ----
  app.post(
    '/internal/sessions/:id/remote-assist/handback',
    asyncHandler((req: Request, res: Response) => {
      const sessionId = req.params.id;
      if (!sessionManager.hasSession(sessionId)) {
        return Promise.resolve(res.status(404).json({ error: 'session_not_found' }));
      }
      const session = sessionManager.getSession(sessionId);
      session.remoteAssistActive = false;
      liveView.closeControlConnection(sessionId);
      liveView.broadcastRemoteAssistStatus(sessionId, false);

      return Promise.resolve(res.json({ session_id: sessionId, remote_assist_active: false }));
    })
  );

  await new Promise<void>((resolve) => {
    server.listen(env.WORKER_PORT, () => {
      console.warn(`🌐 Browser worker ready on http://localhost:${env.WORKER_PORT}`);
      console.warn(`   Max sessions: ${env.WORKER_MAX_SESSIONS}, TTL: ${env.WORKER_SESSION_TTL_MS}ms`);
      resolve();
    });
  });

  const shutdown = async (): Promise<void> => {
    console.warn('🛑 Shutting down browser worker...');
    liveView.close();
    await sessionManager.shutdown();
    server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

main().catch((err) => {
  console.error('❌ Browser worker failed:', err);
  process.exit(1);
});
