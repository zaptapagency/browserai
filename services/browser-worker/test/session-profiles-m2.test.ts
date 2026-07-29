import { describe, it, expect, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ProxyAdapter, type ProxyConnection, type ProxyRotationConfig } from '@browserai/providers';
import { SessionManager } from '../src/session';
import type { ArtifactManager } from '../src/artifact-manager';

/** In-memory stand-in for ArtifactManager's profile-state persistence. */
class FakeArtifactStore {
  private readonly store = new Map<string, unknown>();

  saveProfileState(organizationId: string, profileName: string, state: unknown): Promise<void> {
    this.store.set(`${organizationId}/${profileName}`, state);
    return Promise.resolve();
  }

  loadProfileState(organizationId: string, profileName: string): Promise<unknown> {
    return Promise.resolve(this.store.get(`${organizationId}/${profileName}`) ?? null);
  }

  asArtifactManager(): ArtifactManager {
    return this as unknown as ArtifactManager;
  }
}

class RecordingProxyAdapter extends ProxyAdapter {
  name = 'recording';
  calls: { sessionId: string; config: ProxyRotationConfig }[] = [];

  getProxy(sessionId: string, config: ProxyRotationConfig): Promise<ProxyConnection> {
    this.calls.push({ sessionId, config });
    return Promise.resolve({ host: '127.0.0.1', port: 9, type: 'http' });
  }

  rotateProxy(sessionId: string): Promise<ProxyConnection> {
    return this.getProxy(sessionId, {});
  }

  reportBlocked(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('SessionManager — profile modes (M2)', () => {
  const managers: SessionManager[] = [];
  const tmpDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(managers.splice(0).map((m) => m.shutdown()));
    await Promise.all(tmpDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
  });

  it('persists and restores storage state across sessions for a fixed-identity profile', async () => {
    const artifacts = new FakeArtifactStore();
    const manager = new SessionManager(4, { artifacts: artifacts.asArtifactManager() });
    managers.push(manager);

    const first = await manager.createSession({
      sessionId: 'fixed-1',
      organizationId: 'org-1',
      profileMode: 'fixed-identity',
      profileName: 'profile-alpha',
      ttlMs: 60_000,
    });
    await first.context.addCookies([
      {
        name: 'session_marker',
        value: 'persisted-value',
        domain: 'example.com',
        path: '/',
      },
    ]);
    await manager.closeSession('fixed-1', 'user');

    // A second session for the same profile should restore the cookie.
    const second = await manager.createSession({
      sessionId: 'fixed-2',
      organizationId: 'org-1',
      profileMode: 'fixed-identity',
      profileName: 'profile-alpha',
      ttlMs: 60_000,
    });
    const cookies = await second.context.cookies('https://example.com');
    expect(cookies.find((c) => c.name === 'session_marker')?.value).toBe('persisted-value');

    await manager.closeSession('fixed-2', 'user');
  });

  it('requires a profileName for fixed-identity sessions', async () => {
    const manager = new SessionManager(4);
    managers.push(manager);
    await expect(
      manager.createSession({
        sessionId: 'fixed-missing-name',
        organizationId: 'org-1',
        profileMode: 'fixed-identity',
        ttlMs: 60_000,
      })
    ).rejects.toThrow(/profileName is required/);
  });

  it('launches a dedicated persistent context for local-chrome mode', async () => {
    const manager = new SessionManager(4);
    managers.push(manager);
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'browserai-local-chrome-'));
    tmpDirs.push(userDataDir);

    const session = await manager.createSession({
      sessionId: 'local-1',
      organizationId: 'org-1',
      profileMode: 'local-chrome',
      userDataDir,
      ttlMs: 60_000,
    });

    expect(session.status).toBe('active');
    expect(session.profileMode).toBe('local-chrome');
    await manager.closeSession('local-1', 'user');

    // The user data directory should now contain persisted Chromium profile files.
    const entries = await fs.readdir(userDataDir);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('requires a userDataDir for local-chrome sessions', async () => {
    const manager = new SessionManager(4);
    managers.push(manager);
    await expect(
      manager.createSession({
        sessionId: 'local-missing-dir',
        organizationId: 'org-1',
        profileMode: 'local-chrome',
        ttlMs: 60_000,
      })
    ).rejects.toThrow(/userDataDir is required/);
  });

  it('resolves a proxy via the configured ProxyAdapter when useProxyAdapter is set', async () => {
    const proxyAdapter = new RecordingProxyAdapter();
    const manager = new SessionManager(4, { proxyAdapter });
    managers.push(manager);

    const session = await manager.createSession({
      sessionId: 'proxy-1',
      organizationId: 'org-1',
      profileMode: 'rotating',
      useProxyAdapter: true,
      ttlMs: 60_000,
    });

    expect(proxyAdapter.calls).toHaveLength(1);
    expect(proxyAdapter.calls[0].sessionId).toBe('proxy-1');

    await manager.closeSession('proxy-1', 'user');
  });

  it('does not call the ProxyAdapter when useProxyAdapter is not set', async () => {
    const proxyAdapter = new RecordingProxyAdapter();
    const manager = new SessionManager(4, { proxyAdapter });
    managers.push(manager);

    await manager.createSession({
      sessionId: 'proxy-2',
      organizationId: 'org-1',
      profileMode: 'rotating',
      ttlMs: 60_000,
    });

    expect(proxyAdapter.calls).toHaveLength(0);
    await manager.closeSession('proxy-2', 'user');
  });
});
