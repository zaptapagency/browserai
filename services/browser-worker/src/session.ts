/**
 * Session Manager
 *
 * Owns the Playwright browser and manages the lifecycle of isolated sessions.
 * Each session gets ONE browser context (guaranteeing cookie/storage isolation)
 * and one page. Sessions have a TTL and are cleaned up automatically.
 *
 * Profile modes:
 *   - rotating        → fresh context in the shared browser, ephemeral
 *   - fixed-identity   → context in the shared browser; storage state
 *                       (cookies/localStorage) is restored from and saved
 *                       back to the named profile, giving it a durable
 *                       identity across sessions
 *   - local-chrome    → dedicated persistent context rooted at a caller
 *                       supplied user data directory
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from 'playwright';
import { EventEmitter } from 'node:events';
import { MockProxyAdapter, type ProxyAdapter, type ProxyConnection, type ProxyRotationConfig } from '@browserai/providers';
import type { ArtifactManager } from './artifact-manager';

export type ProfileMode = 'rotating' | 'fixed-identity' | 'local-chrome';

export interface FingerprintConfig {
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezoneId?: string;
  deviceScaleFactor?: number;
}

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface CreateSessionOptions {
  sessionId: string;
  organizationId: string;
  profileMode: ProfileMode;
  fingerprint?: FingerprintConfig;
  /** Explicit proxy config. Takes precedence over adapter-resolved proxies. */
  proxy?: ProxyConfig;
  /** Resolve a proxy via the configured ProxyAdapter when no explicit proxy is given. */
  useProxyAdapter?: boolean;
  proxyRotation?: ProxyRotationConfig;
  /**
   * Stable profile name. Required for 'fixed-identity' mode: storage state
   * (cookies/localStorage) is persisted under this name and restored on
   * future sessions, giving the profile a durable identity across runs.
   */
  profileName?: string;
  /**
   * Local Chrome user data directory. Required for 'local-chrome' mode:
   * launches a dedicated, persistent browser context rooted at this
   * directory instead of a context inside the shared worker browser.
   */
  userDataDir?: string;
  /** Optional browser channel for local-chrome mode (defaults to bundled Chromium). */
  chromeChannel?: 'chrome' | 'chrome-beta' | 'msedge';
  ttlMs: number;
}

function toPlaywrightProxy(conn: ProxyConnection): { server: string; username?: string; password?: string } {
  return {
    server: `${conn.type}://${conn.host}:${conn.port}`,
    username: conn.username,
    password: conn.password,
  };
}

export type SessionStatus = 'starting' | 'active' | 'closing' | 'closed';

export interface SessionLogEvent {
  sessionId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

/**
 * A live browser session: context + page + metadata.
 */
export class Session {
  public status: SessionStatus = 'starting';
  public readonly startedAtMs = Date.now();
  public actionCount = 0;
  /** True while a human has taken over via remote-assist; pauses automated tasks. */
  public remoteAssistActive = false;
  private ttlTimer: NodeJS.Timeout | null = null;

  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly profileMode: ProfileMode,
    public readonly context: BrowserContext,
    public readonly page: Page,
    private readonly onExpire: (id: string) => void,
    ttlMs: number,
    public readonly profileName?: string
  ) {
    this.ttlTimer = setTimeout(() => this.onExpire(this.id), ttlMs);
  }

  clearTtl(): void {
    if (this.ttlTimer) {
      clearTimeout(this.ttlTimer);
      this.ttlTimer = null;
    }
  }
}

/**
 * Manages the shared browser and all active sessions.
 */
export class SessionManager extends EventEmitter {
  private browser: Browser | null = null;
  private readonly sessions = new Map<string, Session>();
  private readonly proxyAdapter: ProxyAdapter;
  private readonly artifacts?: ArtifactManager;

  constructor(
    private readonly maxSessions: number,
    options?: { artifacts?: ArtifactManager; proxyAdapter?: ProxyAdapter }
  ) {
    super();
    this.artifacts = options?.artifacts;
    this.proxyAdapter = options?.proxyAdapter ?? new MockProxyAdapter();
  }

  /** Lazily launch the shared Chromium browser (used by rotating/fixed-identity modes). */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
    }
    return this.browser;
  }

  private log(session: Session, level: SessionLogEvent['level'], message: string): void {
    const event: SessionLogEvent = {
      sessionId: session.id,
      level,
      message,
      timestamp: new Date().toISOString(),
    };
    this.emit('log', event);
  }

  /** Resolve the proxy to apply to a new context, if any. */
  private async resolveProxy(
    opts: CreateSessionOptions
  ): Promise<{ server: string; username?: string; password?: string } | undefined> {
    if (opts.proxy) {
      return { server: opts.proxy.server, username: opts.proxy.username, password: opts.proxy.password };
    }
    if (opts.useProxyAdapter) {
      const connection = await this.proxyAdapter.getProxy(opts.sessionId, opts.proxyRotation ?? {});
      return toPlaywrightProxy(connection);
    }
    return undefined;
  }

  /**
   * Create a new isolated session. Behavior depends on profileMode:
   *  - rotating:       ephemeral context in the shared browser, no persisted state.
   *  - fixed-identity: context in the shared browser, storage state restored
   *                    from (and saved back to) the named profile.
   *  - local-chrome:   dedicated persistent context rooted at a caller-supplied
   *                    user data directory (survives across worker restarts).
   */
  async createSession(opts: CreateSessionOptions): Promise<Session> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Worker at capacity (${this.maxSessions} sessions)`);
    }
    if (this.sessions.has(opts.sessionId)) {
      throw new Error(`Session already exists: ${opts.sessionId}`);
    }
    if (opts.profileMode === 'fixed-identity' && !opts.profileName) {
      throw new Error('profileName is required for fixed-identity sessions');
    }
    if (opts.profileMode === 'local-chrome' && !opts.userDataDir) {
      throw new Error('userDataDir is required for local-chrome sessions');
    }

    const proxy = await this.resolveProxy(opts);
    const contextOptions = {
      userAgent: opts.fingerprint?.userAgent,
      viewport: opts.fingerprint?.viewport ?? { width: 1280, height: 720 },
      locale: opts.fingerprint?.locale ?? 'en-US',
      timezoneId: opts.fingerprint?.timezoneId,
      deviceScaleFactor: opts.fingerprint?.deviceScaleFactor,
      proxy,
    };

    let context: BrowserContext;

    if (opts.profileMode === 'local-chrome') {
      context = await chromium.launchPersistentContext(opts.userDataDir!, {
        ...contextOptions,
        headless: true,
        channel: opts.chromeChannel,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
    } else {
      const browser = await this.getBrowser();
      let storageState: BrowserContextOptions['storageState'];
      if (opts.profileMode === 'fixed-identity') {
        const persisted = await this.artifacts?.loadProfileState(
          opts.organizationId,
          opts.profileName!
        );
        if (persisted) {
          storageState = persisted as BrowserContextOptions['storageState'];
        }
      }
      context = await browser.newContext({
        ...contextOptions,
        storageState,
      });
    }

    const page = context.pages()[0] ?? (await context.newPage());

    const session = new Session(
      opts.sessionId,
      opts.organizationId,
      opts.profileMode,
      context,
      page,
      (id) => {
        void this.closeSession(id, 'ttl');
      },
      opts.ttlMs,
      opts.profileName
    );

    // Forward browser console + page errors as session logs
    page.on('console', (msg) => {
      this.log(session, 'debug', `[console] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      this.log(session, 'error', `[pageerror] ${err.message}`);
    });

    session.status = 'active';
    this.sessions.set(session.id, session);
    this.log(session, 'info', `Session ${session.id} started (${session.profileMode})`);
    this.emit('session_status', { sessionId: session.id, status: session.status });

    return session;
  }

  /** Get a session by id, or throw. */
  getSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  /** Whether a session exists. */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /** Count of active sessions. */
  get activeCount(): number {
    return this.sessions.size;
  }

  /**
   * Close a session and free its context.
   */
  async closeSession(sessionId: string, reason: 'user' | 'ttl' | 'shutdown'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'closing';
    session.clearTtl();
    this.log(session, 'info', `Closing session ${sessionId} (reason: ${reason})`);

    if (session.profileMode === 'fixed-identity' && session.profileName && this.artifacts) {
      try {
        const state = await session.context.storageState();
        await this.artifacts.saveProfileState(session.organizationId, session.profileName, state);
      } catch (err) {
        this.log(session, 'warn', `Error persisting profile state: ${(err as Error).message}`);
      }
    }

    try {
      await session.context.close();
    } catch (err) {
      this.log(session, 'warn', `Error closing context: ${(err as Error).message}`);
    }

    session.status = 'closed';
    this.sessions.delete(sessionId);
    this.emit('session_status', { sessionId, status: 'closed', reason });
  }

  /**
   * Gracefully shut down: close all sessions and the browser.
   */
  async shutdown(): Promise<void> {
    const ids = Array.from(this.sessions.keys());
    await Promise.all(ids.map((id) => this.closeSession(id, 'shutdown')));
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
