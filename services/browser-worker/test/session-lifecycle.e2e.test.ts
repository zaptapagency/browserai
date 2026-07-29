import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SessionManager } from '../src/session';
import { TaskRunner } from '../src/task-runner';
import { executeAction, type ExecutionContext } from '../src/action-executor';
import type { PageState } from '@browserai/core';

/**
 * Minimal two-page site:
 *   /         → a link that navigates to /results
 *   /results  → a repeating list of items to extract
 */
function buildServer(): http.Server {
  return http.createServer((req, res) => {
    if (req.url === '/results') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><html><body>
        <h1>Results</h1>
        <ul class="items">
          <li class="item"><span class="label">Alpha</span></li>
          <li class="item"><span class="label">Beta</span></li>
          <li class="item"><span class="label">Gamma</span></li>
        </ul>
      </body></html>`);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><html><body>
      <h1>Home</h1>
      <a href="/results">Show results</a>
    </body></html>`);
  });
}

describe('session lifecycle e2e', () => {
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

  it('starts a session, navigates, clicks, extracts data, then closes', async () => {
    // ---- start session ----
    const session = await manager.createSession({
      sessionId: 'e2e-1',
      organizationId: 'org-1',
      profileMode: 'rotating',
      ttlMs: 60_000,
    });
    expect(manager.hasSession('e2e-1')).toBe(true);
    expect(session.status).toBe('active');

    const ctx = (): ExecutionContext => ({
      sessionId: session.id,
      actionCount: session.actionCount,
      startedAtMs: session.startedAtMs,
    });

    // ---- navigate ----
    const navResult = await executeAction(
      session.page,
      { type: 'navigate', url: baseUrl, timeout_ms: 30_000 },
      0,
      ctx()
    );
    expect(navResult.status).toBe('success');
    const homeState = navResult.page_state as PageState;
    const link = homeState.elements.find((e) => e.name === 'Show results');
    expect(link).toBeDefined();

    // ---- click ----
    const clickResult = await executeAction(
      session.page,
      { type: 'click', id: link!.id, timeout_ms: 5000 },
      1,
      ctx()
    );
    expect(clickResult.status).toBe('success');
    expect(session.page.url()).toContain('/results');

    // ---- extract ----
    const extractResult = await executeAction(
      session.page,
      {
        type: 'extract',
        schema: {
          type: 'array',
          itemSelector: 'li.item',
          items: {
            type: 'object',
            properties: { label: { type: 'string', selector: '.label' } },
          },
        },
        timeout_ms: 5000,
      },
      2,
      ctx()
    );
    expect(extractResult.status).toBe('success');
    const payload = extractResult.result as { data: unknown; itemCount: number };
    expect(payload.itemCount).toBe(3);
    expect(payload.data).toEqual([{ label: 'Alpha' }, { label: 'Beta' }, { label: 'Gamma' }]);

    // ---- close ----
    await manager.closeSession('e2e-1', 'user');
    expect(manager.hasSession('e2e-1')).toBe(false);
    expect(manager.activeCount).toBe(0);
  });

  it('runs the same flow through the TaskRunner with retry semantics', async () => {
    const session = await manager.createSession({
      sessionId: 'e2e-2',
      organizationId: 'org-1',
      profileMode: 'rotating',
      ttlMs: 60_000,
    });

    const runner = new TaskRunner();
    const completed: number[] = [];
    runner.on('action_complete', (r) => completed.push(r.action_index));

    const result = await runner.run(session, 'task-1', [
      { type: 'navigate', url: `${baseUrl}/results`, timeout_ms: 30_000 },
      {
        type: 'extract',
        schema: { type: 'array', itemSelector: 'li.item', items: { type: 'string' } },
        timeout_ms: 5000,
      },
    ]);

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(2);
    expect(completed).toEqual([0, 1]);
    expect(session.actionCount).toBe(2);

    await manager.closeSession('e2e-2', 'user');
  });

  it('enforces the session capacity limit', async () => {
    const small = new SessionManager(1);
    await small.createSession({
      sessionId: 'cap-1',
      organizationId: 'org-1',
      profileMode: 'rotating',
      ttlMs: 60_000,
    });
    await expect(
      small.createSession({
        sessionId: 'cap-2',
        organizationId: 'org-1',
        profileMode: 'rotating',
        ttlMs: 60_000,
      })
    ).rejects.toThrow(/capacity/);
    await small.shutdown();
  });
});
