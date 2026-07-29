import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { MockCaptchaAdapter } from '@browserai/providers';
import { SessionManager } from '../src/session';
import { TaskRunner } from '../src/task-runner';
import { ConfirmationRegistry } from '../src/confirmation-registry';
import type { ConfirmationGate } from '@browserai/core';

function buildServer(): http.Server {
  return http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html><body><h1>Home</h1></body></html>');
  });
}

describe('TaskRunner — confirmation gating (M2)', () => {
  let server: http.Server;
  let baseUrl: string;
  let manager: SessionManager;

  beforeAll(async () => {
    server = buildServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    manager = new SessionManager(4);
  });

  afterAll(async () => {
    await manager.shutdown();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('pauses a solve_captcha action pending confirmation, then runs it once a valid token is presented', async () => {
    const session = await manager.createSession({
      sessionId: 'gate-1',
      organizationId: 'org-1',
      profileMode: 'rotating',
      ttlMs: 60_000,
    });

    const registry = new ConfirmationRegistry('test-secret');
    const runner = new TaskRunner(registry);
    const captchaAdapter = new MockCaptchaAdapter();

    const actions = [
      { type: 'navigate' as const, url: baseUrl, timeout_ms: 30_000 },
      {
        type: 'solve_captcha' as const,
        challenge: { type: 'recaptcha_v2' as const, pageUrl: baseUrl },
        timeout_ms: 30_000,
      },
    ];

    // First run: no confirmation token supplied → task stops, gate returned.
    const firstRun = await runner.run(session, 'task-gate-1', actions, { captchaAdapter });
    expect(firstRun.status).toBe('error');
    expect(firstRun.results).toHaveLength(2);
    expect(firstRun.results[1].status).toBe('skipped');
    const gate = firstRun.results[1].result as ConfirmationGate;
    expect(gate.requires_confirmation).toBe(true);
    expect(gate.action_type).toBe('solve_captcha');

    // Second run: valid confirmation token supplied → action executes.
    const secondRun = await runner.run(session, 'task-gate-2', actions, {
      captchaAdapter,
      confirmations: { 1: gate.confirm_token },
    });
    expect(secondRun.status).toBe('success');
    expect(secondRun.results[1].status).toBe('success');
    const solved = secondRun.results[1].result as { token: string };
    expect(solved.token).toMatch(/^mock_token_/);

    await manager.closeSession('gate-1', 'user');
  });

  it('rejects a task when an invalid confirmation token is presented', async () => {
    const session = await manager.createSession({
      sessionId: 'gate-2',
      organizationId: 'org-1',
      profileMode: 'rotating',
      ttlMs: 60_000,
    });

    const registry = new ConfirmationRegistry('test-secret');
    const runner = new TaskRunner(registry);
    const captchaAdapter = new MockCaptchaAdapter();

    const result = await runner.run(
      session,
      'task-gate-3',
      [
        {
          type: 'solve_captcha',
          challenge: { type: 'recaptcha_v2', pageUrl: baseUrl },
          timeout_ms: 30_000,
        },
      ],
      { captchaAdapter, confirmations: { 0: 'not-a-real-token' } }
    );

    expect(result.status).toBe('error');
    expect(result.results[0].status).toBe('error');
    expect(result.results[0].error).toMatch(/Invalid or expired confirmation token/);

    await manager.closeSession('gate-2', 'user');
  });

  it('refuses to run any actions while remote-assist is active', async () => {
    const session = await manager.createSession({
      sessionId: 'remote-assist-1',
      organizationId: 'org-1',
      profileMode: 'rotating',
      ttlMs: 60_000,
    });
    session.remoteAssistActive = true;

    const runner = new TaskRunner();
    const result = await runner.run(session, 'task-ra-1', [
      { type: 'navigate', url: baseUrl, timeout_ms: 30_000 },
    ]);

    expect(result.status).toBe('error');
    expect(result.results).toHaveLength(0);
    expect(result.error).toMatch(/remote-assist/);

    await manager.closeSession('remote-assist-1', 'user');
  });
});
